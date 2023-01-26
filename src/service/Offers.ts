// @ts-check

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
import type { Marshal } from '@endo/marshal';
import type { Notifier } from '@agoric/notifier/src/types';
import type { Petname } from '@agoric/smart-wallet/src/types';
import type { Brand } from '@agoric/ertp/src/types';
import { AmountMath } from '@agoric/ertp';

export const getOfferService = (
  smartWalletKey: SmartWalletKey,
  signSpendAction: (data: string) => Promise<any>,
  chainOffersNotifier: Notifier<OfferStatus>,
  boardIdMarshaller: Marshal<string>,
) => {
  const offers = new Map<number, Offer>();
  const { notifier, updater } = makeNotifierKit<Offer[]>();
  const broadcastUpdates = () => updater.updateState([...offers.values()]);

  const addSpendActionAndInstancePetname = async (
    pursePetnameToBrand: Map<Petname, Brand>,
    offer: Offer,
  ) => {
    const {
      id,
      instanceHandle,
      publicInvitationMaker,
      proposalTemplate: { give: giveTemplate, want: wantTemplate },
    } = offer;

    const convertProposals = async paymentProposals => {
      const entries = await Promise.all(
        Object.entries(paymentProposals).map(
          // @ts-expect-error
          async ([kw, { pursePetname, value, amount: serializedAmount }]) => {
            if (!serializedAmount && !pursePetnameToBrand.get(pursePetname)) {
              return [];
            }

            /// XXX test e2e with dapp inter once feasible.
            const amount = serializedAmount
              ? await E(boardIdMarshaller).unserialize(serializedAmount)
              : AmountMath.make(
                  pursePetnameToBrand.get(pursePetname),
                  BigInt(value),
                );

            return [kw, amount];
          },
        ),
      );
      return Object.fromEntries(entries);
    };

    const deconstructInstance = async () => {
      const instance = await E(boardIdMarshaller).unserialize(instanceHandle);
      const {
        slots: [instanceBoardId],
      } = await E(boardIdMarshaller).serialize(instance);

      return { instance, instanceBoardId };
    };

    const [{ instance, instanceBoardId }, give, want] = await Promise.all([
      deconstructInstance(),
      convertProposals(giveTemplate),
      convertProposals(wantTemplate),
    ]);

    const offerForAction: OfferSpec = {
      id,
      invitationSpec: {
        source: 'contract',
        instance,
        publicInvitationMaker,
      },
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
      instancePetname: `instance@${instanceBoardId}`,
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
  const start = (pursePetnameToBrand: Map<Petname, Brand>) => {
    const storedOffers = load(smartWalletKey);
    const storedOffersP = Promise.all(
      storedOffers.map(async (o: Offer) => {
        if (o.status === OfferUIStatus.declined) {
          remove(smartWalletKey, o.id);
        }
        const ao = await addSpendActionAndInstancePetname(
          pursePetnameToBrand,
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
          return addSpendActionAndInstancePetname(pursePetnameToBrand, o).then(
            ao => {
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
            },
          );
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
