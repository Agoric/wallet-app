// @ts-check

import { AmountMath } from '@agoric/ertp';
import {
  makeNotifierKit,
  makeAsyncIterableFromNotifier,
} from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import {
  loadOffers as load,
  removeOffer as remove,
  addOffer as add,
  watchOffers,
  OfferUIStatus,
  Offer,
} from '../store/Offers';

import type { SmartWalletKey } from '../store/Dapps';
import type { OfferSpec, OfferStatus } from '@agoric/smart-wallet/src/offers';
import type { CapData, Marshal } from '@endo/marshal';
import type { Notifier } from '@agoric/notifier/src/types';
import type { Petname } from '@agoric/smart-wallet/src/types';
import type { Brand } from '@agoric/ertp/src/types';
import type { PurseInfo } from '@agoric/web-components/src/keplr-connection/fetchCurrent';

type GiveOrWantEntries = {
  [keyword: string]: {
    value?: number | string; // Localstorage cannot serialize BigInt.
    pursePetname?: Petname;
    amount?: CapData<string>;
  };
};

export const getOfferService = (
  smartWalletKey: SmartWalletKey,
  signSpendAction: (data: string) => Promise<any>,
  chainOffersNotifier: Notifier<OfferStatus>,
  boardIdMarshaller: Marshal<string>,
) => {
  const offers = new Map<number, Offer>();
  const { notifier, updater } = makeNotifierKit<Offer[]>();
  const broadcastUpdates = () => updater.updateState([...offers.values()]);

  // Takes an offer object from storage and augments it with a spend action and
  // everything needed to display it in the UI.
  const unserializeOfferFromStorage = async (
    pursePetnameToBrand: Map<Petname, Brand>,
    brandToPurse: Map<Brand, PurseInfo>,
    offer: Offer,
  ) => {
    const {
      id,
      instanceHandle,
      publicInvitationMaker,
      invitationSpec,
      proposalTemplate: { give: giveTemplate, want: wantTemplate },
    } = offer;

    // Takes give/want entries from dapps and converts them into something
    // usable in an offer txn. If the entry has an amount, unserialize it. If
    // the entry has a pursePetname and value, create an amount from those.
    const convertProposals = async (paymentProposals: GiveOrWantEntries) => {
      const entries = await Promise.all(
        Object.entries(paymentProposals).map(
          async ([kw, { pursePetname, value, amount: serializedAmount }]) => {
            // First try using serializedAmount.
            if (serializedAmount) {
              const amount = await E(boardIdMarshaller).unserialize(
                serializedAmount,
              );
              return [kw, amount];
            }

            // Next try getting by petname. Look up brand just once.
            const brand = pursePetname && pursePetnameToBrand.get(pursePetname);
            if (brand) {
              assert(typeof value !== 'undefined');
              const amount = AmountMath.make(brand, BigInt(value));
              return [kw, amount];
            }

            // Can't find it.
            return [];
          },
        ),
      );
      return Object.fromEntries(entries);
    };

    // Takes give/want entries from dapps and augments them with data needed to
    // display them in the UI, namely a pursePetname and value.
    const makeProposalTemplateDisplayable = async (
      proposalTemplate: GiveOrWantEntries,
    ) =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(proposalTemplate).map(async ([kw, entry]) => {
            if (entry.amount && !(entry.pursePetname && entry.value)) {
              const unserializedAmount = await E(boardIdMarshaller).unserialize(
                entry.amount,
              );
              entry.pursePetname = brandToPurse.get(
                unserializedAmount.brand,
              ).pursePetname;
              entry.value = String(unserializedAmount.value);
            }
            return [kw, entry];
          }),
        ),
      );

    const [give, want, displayableGiveTemplate, displayableWantTemplate] =
      await Promise.all([
        convertProposals(giveTemplate),
        convertProposals(wantTemplate),
        makeProposalTemplateDisplayable(giveTemplate),
        makeProposalTemplateDisplayable(wantTemplate),
      ]);

    const [invitationSpecToUse, sourceDescription] = await (async () => {
      if (invitationSpec) {
        return [invitationSpec, 'Continuing Invitation'];
      }

      const instance = await E(boardIdMarshaller).unserialize(instanceHandle);
      const invitationSpecToUse = {
        source: 'contract',
        instance,
        publicInvitationMaker,
      };
      const instanceBoardId = `instance@${
        (await E(boardIdMarshaller).serialize(instance)).slots[0]
      }`;

      return [invitationSpecToUse, instanceBoardId];
    })();

    const offerForAction: OfferSpec = {
      id,
      invitationSpec: invitationSpecToUse,
      proposal: {
        give,
        want,
      },
    };

    const spendAction = await E(boardIdMarshaller).serialize(
      harden({
        method: 'executeOffer',
        offer: offerForAction,
      }),
    );

    return {
      ...offer,
      proposalTemplate: {
        give: displayableGiveTemplate,
        want: displayableWantTemplate,
      },
      sourceDescription,
      spendAction: JSON.stringify(spendAction),
    };
  };

  const upsertOffer = (offer: Offer) => {
    offers.set(offer.id, offer);
    add(smartWalletKey, offer);
    broadcastUpdates();
  };

  const declineOffer = (id: number) => {
    const offer = offers.get(id);
    assert(offer, `Tried to decline undefined offer ${id}`);
    upsertOffer({ ...offer, status: OfferUIStatus.declined });
    broadcastUpdates();
  };

  const acceptOffer = async (id: number) => {
    const offer = offers.get(id);
    assert(offer, `Tried to accept undefined offer ${id}`);
    assert(offer.spendAction, 'Missing spendAction');
    return signSpendAction(offer.spendAction);
  };

  const cancelOffer = _id => {
    console.log('TODO: cancel offer');
  };

  const watchChainOffers = async () => {
    for await (const status of makeAsyncIterableFromNotifier(
      chainOffersNotifier,
    )) {
      console.log('offerStatus', { status, offers });
      const id = status && Number(status?.id);
      const oldOffer = offers.get(id);
      if (!oldOffer) {
        console.warn('Update for unknown offer, doing nothing.');
      } else {
        if (status.error !== undefined) {
          offers.set(id, {
            ...oldOffer,
            id,
            status: OfferUIStatus.rejected,
            error: `${status.error}`,
          });
          remove(smartWalletKey, id);
        } else if (status.numWantsSatisfied !== undefined) {
          offers.set(id, {
            ...oldOffer,
            id,
            status: OfferUIStatus.accepted,
          });
          remove(smartWalletKey, id);
        } else if (status.numWantsSatisfied === undefined) {
          offers.set(id, {
            ...oldOffer,
            id,
            status: OfferUIStatus.pending,
          });
          upsertOffer({ ...oldOffer, status: OfferUIStatus.pending });
        }
        broadcastUpdates();
      }
    }
  };

  /**
   * Call once to load the offers from storage, watch storage and chain for new
   * offers.
   */
  const start = (
    pursePetnameToBrand: Map<Petname, Brand>,
    brandToPurse: Map<Brand, PurseInfo>,
  ) => {
    const storedOffers = load(smartWalletKey);
    const storedOffersP = Promise.all(
      storedOffers.map(async (o: Offer) => {
        if (o.status === OfferUIStatus.declined) {
          remove(smartWalletKey, o.id);
        }
        const ao = await unserializeOfferFromStorage(
          pursePetnameToBrand,
          brandToPurse,
          o,
        );
        offers.set(ao.id, {
          ...ao,
        });
      }),
    );
    storedOffersP.then(() => broadcastUpdates()).catch(console.error);

    watchChainOffers().catch(console.error);

    watchOffers(smartWalletKey, newOffers => {
      const newOffersP = Promise.all(
        newOffers.map(o => {
          return unserializeOfferFromStorage(
            pursePetnameToBrand,
            brandToPurse,
            o,
          ).then(ao => {
            const oldOffer = offers.get(ao.id);
            const status =
              oldOffer &&
              [OfferUIStatus.rejected, OfferUIStatus.accepted].includes(
                oldOffer.status,
              )
                ? oldOffer.status
                : ao.status;
            offers.set(ao.id, {
              ...ao,
              status,
            });
          });
        }),
      );
      newOffersP.then(() => broadcastUpdates()).catch(console.error);
    });
  };

  return {
    start,
    offers,
    notifier,
    addOffer: upsertOffer,
    acceptOffer,
    cancelOffer,
    declineOffer,
  };
};
