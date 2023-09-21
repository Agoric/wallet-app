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
import type { Amount, Brand, DisplayInfo } from '@agoric/ertp/src/types';
import type { InvitationSpec } from '@agoric/smart-wallet/src/invitations';
import { AgoricChainStoragePathKind, ChainStorageWatcher } from '@agoric/rpc';
import { deeplyFulfilledObject, objectMap } from '@agoric/internal';

// XXX These should be imported from @agoric/web-components.
export type PurseInfo = {
  currentAmount: Amount<'nat'>;
  brand?: Brand;
  brandPetname?: Petname;
  pursePetname?: Petname;
  displayInfo?: DisplayInfo;
  denom?: string;
};

// XXX better name?
type PurseDisplayInfo = {
  value?: number | string; // Localstorage cannot serialize BigInt.
  pursePetname?: Petname;
  amount?: CapData<string>;
};
type GiveOrWantEntries = {
  [keyword: string]: PurseDisplayInfo;
};

const sourceDescriptionForSpec = (spec: InvitationSpec) => {
  switch (spec.source) {
    case 'continuing':
      return `${spec.invitationMakerName} from offer result ${spec.previousOffer}`;
    case 'agoricContract':
      return `${spec.instancePath.join('.')}`;
    default:
      return spec.source;
  }
};

export const getOfferService = (
  smartWalletKey: SmartWalletKey,
  signSpendAction: (data: string) => Promise<any>,
  offerUpdatesNotifier: Notifier<OfferStatus>,
  pendingOffersNotifier: Notifier<OfferStatus>,
  boardIdMarshaller: Marshal<string>,
  watcher: ChainStorageWatcher,
) => {
  const offers = new Map<number, Offer>();
  const { notifier, updater } = makeNotifierKit<Offer[]>();
  const broadcastUpdates = () => updater.updateState([...offers.values()]);

  const brandsP = watcher.queryOnce<[string, unknown][]>([
    AgoricChainStoragePathKind.Data,
    'published.agoricNames.brand',
  ]);

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

    const readDisplayInfo = async (entry: PurseDisplayInfo) => {
      const amount: Amount = await E(boardIdMarshaller).unserialize(
        entry.amount as CapData<string>,
      );
      const purse = brandToPurse.get(amount.brand);

      if (purse) {
        const { pursePetname: brandPetname, displayInfo } = purse;
        return harden({ amount, brandPetname, displayInfo });
      }

      const [brands, boardAux] = await Promise.all([
        brandsP,
        watcher.queryBoardAux<{
          displayInfo: DisplayInfo;
        }>([amount.brand])[0],
      ]);

      const brandPetname: string = brands
        .find(([_, brand]) => brand === brand)
        ?.at(0) as string;
      const displayInfo: DisplayInfo | undefined = boardAux?.displayInfo;

      return harden({ amount, brandPetname, displayInfo });
    };

    // Takes give/want entries from dapps and augments them with data needed to
    // display them in the UI, namely a pursePetname and value.
    const makeProposalTemplateDisplayable = (
      proposalTemplate: GiveOrWantEntries,
    ) => {
      return deeplyFulfilledObject(
        objectMap(proposalTemplate, readDisplayInfo),
      );
    };

    const [give, want, displayableGiveTemplate, displayableWantTemplate] =
      await Promise.all([
        convertProposals(giveTemplate),
        convertProposals(wantTemplate),
        makeProposalTemplateDisplayable(giveTemplate),
        makeProposalTemplateDisplayable(wantTemplate),
      ]);

    const [invitationSpecToUse, sourceDescription] = await (async () => {
      if (invitationSpec) {
        const unserializedSpec = await E(boardIdMarshaller).unserialize(
          invitationSpec,
        );
        const source = sourceDescriptionForSpec(unserializedSpec);

        return [unserializedSpec, `Source: ${source}`];
      }

      const instance = await E(boardIdMarshaller).unserialize(instanceHandle);
      const invitationSpecToUse = {
        source: 'contract',
        instance,
        publicInvitationMaker,
      };
      const instanceBoardId = (await E(boardIdMarshaller).serialize(instance))
        .slots[0];

      return [invitationSpecToUse, `Source: instance at ${instanceBoardId}`];
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

  const tryExitOffer = async (id: number) => {
    const action = await E(boardIdMarshaller).serialize(
      harden({
        method: 'tryExitOffer',
        offerId: id,
      }),
    );

    return signSpendAction(JSON.stringify(action));
  };

  const watchOfferUpdates = async () => {
    for await (const status of makeAsyncIterableFromNotifier(
      offerUpdatesNotifier,
    )) {
      console.log('offerStatus', { status, offers });
      const id = status?.id;
      const oldOffer = offers.get(id);
      if (!oldOffer) {
        console.warn('Update for unknown offer, doing nothing.');
      } else {
        if (status.numWantsSatisfied !== undefined) {
          offers.set(id, {
            ...oldOffer,
            id,
            status:
              status.numWantsSatisfied === 0
                ? OfferUIStatus.refunded
                : OfferUIStatus.accepted,
            isSeated: false,
            error: status.error && `${status.error}`,
          });
          remove(smartWalletKey, id);
        } else if (status.error !== undefined) {
          offers.set(id, {
            ...oldOffer,
            id,
            status: OfferUIStatus.rejected,
            error: `${status.error}`,
          });
          if (!oldOffer.isSeated) {
            remove(smartWalletKey, id);
          }
        }
        broadcastUpdates();
      }
    }
  };

  const watchPendingOffers = async (brandToPurse: Map<Brand, PurseInfo>) => {
    const makeProposalEntriesDisplayable = async (proposalEntries: {
      [key: string]: Amount;
    }) =>
      Object.fromEntries(
        await Promise.all(
          Object.entries(proposalEntries).map(
            async ([kw, unserializedAmount]) => {
              assert(unserializedAmount);
              const purse = brandToPurse.get(unserializedAmount.brand);
              if (purse) {
                const { pursePetname: brandPetname, displayInfo } = purse;
                return [
                  kw,
                  { amount: unserializedAmount, brandPetname, displayInfo },
                ];
              }

              const [brands, boardAux] = await Promise.all([
                brandsP,
                watcher.queryBoardAux<{
                  displayInfo: DisplayInfo;
                }>([unserializedAmount.brand])[0],
              ]);

              const brandPetname: string = brands
                .find(([_, brand]) => brand === brand)
                ?.at(0) as string;
              const displayInfo: DisplayInfo | undefined =
                boardAux?.displayInfo;

              return [
                kw,
                { amount: unserializedAmount, brandPetname, displayInfo },
              ];
            },
          ),
        ),
      );

    for await (const pendingOffers of makeAsyncIterableFromNotifier(
      pendingOffersNotifier,
    )) {
      console.log('pending offers', pendingOffers);
      if (!pendingOffers) continue;
      for (const [_, o] of pendingOffers) {
        const { id } = o;
        const oldOffer = offers.get(id);
        if (!oldOffer) {
          offers.set(id, {
            ...o,
            proposalTemplate: {
              give:
                o.proposal.give &&
                (await makeProposalEntriesDisplayable(o.proposal.give)),
              want:
                o.proposal.want &&
                (await makeProposalEntriesDisplayable(o.proposal.want)),
            },
            sourceDescription:
              'Source: ' + sourceDescriptionForSpec(o.invitationSpec),
            status: OfferUIStatus.pending,
            isSeated: true,
          });
        } else {
          offers.set(id, {
            ...oldOffer,
            status: OfferUIStatus.pending,
            isSeated: true,
          });
        }
      }
      broadcastUpdates();
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

    watchOfferUpdates().catch(console.error);
    watchPendingOffers(brandToPurse).catch(console.error);

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
    tryExitOffer,
    declineOffer,
  };
};
