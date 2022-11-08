// @ts-check
import { iterateEach, iterateLatest } from '@agoric/casting';
import { AmountMath } from '@agoric/ertp';
import { objectMap } from '@agoric/internal';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
} from '@agoric/notifier';
import {
  assertHasData,
  NO_SMART_WALLET_ERROR,
} from '@agoric/smart-wallet/src/utils.js';
import { E } from '@endo/eventual-send';
import { Far, Marshal } from '@endo/marshal';
import type { querySwingsetParams } from '../util/querySwingsetParams.js';
import { getDappService } from '../service/Dapps.js';
import { getIssuerService } from '../service/Issuers.js';
import { getOfferService } from '../service/Offers.js';

/** @typedef {import('@agoric/cosmic-proto/swingset/swingset.js').Params} SwingsetParams */
// Ambient types. Needed only for dev but this does a runtime import.
import '@agoric/ertp/exported.js';
import '@agoric/ertp/src/types.js';
import '@agoric/notifier/exported.js';
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive
import '@agoric/store/exported.js';
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive
import '@agoric/zoe/exported.js';
import '@endo/captp/src/types.js';
import { Petname } from '@agoric/smart-wallet/src/types.js';
import { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet.js';
import { SmartWalletKey } from '../store/Dapps.js';

const newId = kind => `${kind}${Math.random()}`;

/** @typedef {{actions: object, issuerSuggestions: Promise<AsyncIterator>}} BackendSchema */

export const makeBackendFromWalletBridge = (
  walletBridge: ReturnType<typeof makeWalletBridgeFromFollowers>,
) => {
  const iterateNotifier = async <T>(notifier: ERef<Notifier<T>>) =>
    makeAsyncIterableFromNotifier(notifier)[Symbol.asyncIterator]();

  // XXX we don't have access to the board yet.
  const { notifier: servicesNotifier } = makeNotifierKit();

  /**
   * @param {AsyncIterator<any[], any[], undefined>} offersMembers
   */
  const wrapOffersIterator = offersMembers =>
    harden({
      next: async () => {
        const { done, value } = await E(offersMembers).next();
        return harden({
          done,
          value:
            value &&
            value.map(({ id, ...rest }) =>
              harden({
                id,
                ...rest,
                actions: {
                  // Provide these synthetic actions since offers don't have any yet.
                  accept: () => E(walletBridge).acceptOffer(id),
                  decline: () => E(walletBridge).declineOffer(id),
                  cancel: () => E(walletBridge).cancelOffer(id),
                },
              }),
            ),
        });
      },
      return: offersMembers.return,
      throw: offersMembers.throw,
    });

  /** @type {BackendSchema} */
  const firstSchema = harden({
    actions: Far('schemaActions', {
      createPurse: (issuer, id = newId('Purse')) =>
        E(walletBridge).makeEmptyPurse(issuer?.issuerPetname, id),
      createContact: (depositFacet, id = newId('Contact')) =>
        E(walletBridge).addContact(id, depositFacet),
      createIssuer: (issuer, id = newId('Issuer')) =>
        E(walletBridge).addIssuer(id, issuer, true),
    }),
    beansOwing: iterateNotifier(E(walletBridge).getBeansOwingNotifier()),
    services: iterateNotifier(servicesNotifier),
    contacts: iterateNotifier(E(walletBridge).getContactsNotifier()),
    dapps: iterateNotifier(E(walletBridge).getDappsNotifier()),
    issuers: iterateNotifier(E(walletBridge).getIssuersNotifier()),
    offers: wrapOffersIterator(
      iterateNotifier(E(walletBridge).getOffersNotifier()),
    ),
    payments: iterateNotifier(E(walletBridge).getPaymentsNotifier()),
    purses: iterateNotifier(E(walletBridge).getPursesNotifier()),
    issuerSuggestions: iterateNotifier(
      E(walletBridge).getIssuerSuggestionsNotifier(),
    ),
    swingsetParams: E(walletBridge).getSwingsetParams(),
  });

  // Just produce a single update for the initial backend.
  // TODO: allow further updates.
  /** @type {NotifierRecord<BackendSchema>} */
  const { notifier: backendNotifier, updater: backendUpdater } =
    makeNotifierKit(firstSchema);

  const backendIt = iterateNotifier(backendNotifier);

  const cancel = e => {
    backendUpdater.fail(e);
  };

  return { backendIt, cancel };
};

/**
 * @param {SmartWalletKey} smartWalletKey
 * @param {String} rpc
 * @param {ReturnType<import('@endo/marshal').makeMarshal>} marshaller
 * @param {import('@agoric/casting').ValueFollower<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>} currentFollower
 * @param {import('@agoric/casting').ValueFollower<import('@agoric/smart-wallet/src/smartWallet').UpdateRecord>} updateFollower
 * @param {import('@agoric/casting').ValueFollower<string>} beansOwingFollower
 * @param {import('../contexts/Provider.jsx').KeplrUtils} keplrConnection
 * @param {(e: unknown) => void} [errorHandler]
 * @param {() => void} [firstCallback]
 */
export const makeWalletBridgeFromFollowers = (
  smartWalletKey,
  marshaller,
  currentFollower,
  updateFollower,
  beansOwingFollower,
  keplrConnection,
  errorHandler = e => {
    // Make an unhandled rejection.
    throw e;
  },
  firstCallback: () => void | undefined = () => {},
) => {
  const notifiers = {
    getPursesNotifier: 'purses',
    getContactsNotifier: 'contacts',
    getIssuersNotifier: 'issuers',
    getOffersNotifier: 'offers',
    getPaymentsNotifier: 'payments',
  };

  const notifierKits = Object.fromEntries(
    Object.entries(notifiers).map(([_method, stateName]) => [
      stateName,
      makeNotifierKit(null as any),
    ]),
  );

  const { notifier: beansOwingNotifier, updater: beansOwingUpdater } =
    makeNotifierKit(/** @type {Number?} */ null);

  // We assume just one cosmos purse per brand.
  const brandToPurse = new Map<Brand, PurseInfo>();
  const pursePetnameToBrand = new Map<Petname, Brand>();

  const updatePurses = () => {
    const purses = [] as PurseInfo[];
    for (const [brand, purse] of brandToPurse.entries()) {
      if (purse.currentAmount && purse.brandPetname) {
        assert(purse.pursePetname, 'missing purse.pursePetname');
        pursePetnameToBrand.set(purse.pursePetname, brand);
        purses.push(purse);
      }
    }
    notifierKits.purses.updater.updateState(harden(purses));
  };

  /** @param {string} data */
  const signSpendAction = async data => {
    const {
      signers: { interactiveSigner },
    } = keplrConnection;
    if (!interactiveSigner) {
      throw new Error(
        'Cannot sign a transaction in read only mode, connect to keplr.',
      );
    }
    return interactiveSigner.submitSpendAction(data);
  };

  const getNotifierMethods = objectMap(
    notifiers,
    stateName => () => notifierKits[stateName].notifier,
  );

  /** @type {Notifier<import('@agoric/smart-wallet/src/offers.js').OfferStatus>} */
  const offersNotifer = getNotifierMethods.getOffersNotifier();

  const offerService = getOfferService(
    smartWalletKey,
    signSpendAction,
    offersNotifer,
    marshaller,
  );

  const watchBeansOwing = async () => {
    for await (const { value } of iterateLatest(beansOwingFollower)) {
      beansOwingUpdater.updateState(Number(value));
    }
  };

  const fetchCurrent = async () => {
    await assertHasData(currentFollower);
    void watchBeansOwing();
    const latestIterable = await E(currentFollower).getLatestIterable();
    const iterator = latestIterable[Symbol.asyncIterator]();
    const latest = await iterator.next();
    if (firstCallback) {
      firstCallback();
      Object.values(notifierKits).forEach(({ updater }) =>
        updater.updateState([]),
      );
      // @ts-expect-error xxx param mutation
      firstCallback = undefined;
    }
    /** @type {import('@agoric/casting').ValueFollowerElement<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>} */
    const currentEl = latest.value;
    const wallet = currentEl.value;
    console.log('wallet current', wallet);
    for (const purse of wallet.purses) {
      console.debug('registering purse', purse);
      const brandDescriptor = wallet.brands.find(
        bd => purse.brand === bd.brand,
      );
      assert(brandDescriptor, `missing descriptor for brand ${purse.brand}`);
      /** @type {PurseInfo} */
      const purseInfo = {
        brand: purse.brand,
        currentAmount: purse.balance,
        brandPetname: brandDescriptor.petname,
        pursePetname: brandDescriptor.petname,
        displayInfo: brandDescriptor.displayInfo,
      };
      brandToPurse.set(purse.brand, purseInfo);
    }
    console.debug('brandToPurse map', brandToPurse);
    updatePurses();
    offerService.start(pursePetnameToBrand);
    return currentEl.blockHeight;
  };

  const followLatest = async startingHeight => {
    // @ts-expect-error TODO use newer lib
    for await (const { value } of iterateEach(updateFollower, {
      height: startingHeight,
    })) {
      const updateRecord = value as UpdateRecord;
      switch (updateRecord.updated) {
        case 'brand': {
          const {
            descriptor: { brand, petname, displayInfo },
          } = updateRecord;
          const prior = brandToPurse.get(brand);
          const purseObj = {
            brand,
            brandPetname: petname,
            pursePetname: petname,
            displayInfo,
            currentAmount: prior?.currentAmount || AmountMath.makeEmpty(brand),
          };
          brandToPurse.set(brand, purseObj);
          updatePurses();
          break;
        }
        case 'balance': {
          // TODO: Don't assume just one purse per brand.
          // https://github.com/Agoric/agoric-sdk/issues/6126
          const { currentAmount } = updateRecord;
          const purseObj = {
            ...brandToPurse.get(currentAmount.brand),
            currentAmount,
            value: currentAmount.value,
          };
          brandToPurse.set(currentAmount.brand, purseObj);
          updatePurses();
          break;
        }
        case 'offerStatus': {
          const { status } = updateRecord;
          notifierKits.offers.updater.updateState(status);
          break;
        }
        default: {
          // @ts-expect-error exhaustive switch
          throw Error(`Unknown updateRecord ${updateRecord.updated}`);
        }
      }
    }
  };

  const loadData = () => fetchCurrent().then(followLatest);

  const retry = () => {
    loadData().catch(e => {
      if (e.message === NO_SMART_WALLET_ERROR) {
        setTimeout(retry, 5000);
      } else {
        errorHandler(e);
      }
    });
  };

  loadData().catch(e => {
    errorHandler(e);
    if (e.message === NO_SMART_WALLET_ERROR) {
      setTimeout(retry, 5000);
    }
  });

  const makeEmptyPurse = (_issuerPetname, _purseId) => {
    console.log('make empty purse');
  };

  const addContact = (_boardId, _petname) => {
    console.log('add contact');
  };

  const addIssuer = (_boardId, _petname, _makeDefaultPurse) => {
    console.log('add issuer');
  };

  const issuerService = getIssuerService(signSpendAction);
  const dappService = getDappService(smartWalletKey);
  const { acceptOffer, declineOffer, cancelOffer } = offerService;

  const {
    getContactsNotifier,
    getIssuersNotifier,
    getPaymentsNotifier,
    getPursesNotifier,
  } = getNotifierMethods;

  const fetchSwingsetParams = () =>
    querySwingsetParams(rpc).then(res => res.params);

  const walletBridge = Far('follower wallet bridge', {
    getDappsNotifier: () => dappService.notifier,
    getOffersNotifier: () => offerService.notifier,
    getIssuerSuggestionsNotifier: () => issuerService.notifier,
    getSwingsetParams: () => fetchSwingsetParams(),
    getBeansOwingNotifier: () => beansOwingNotifier,
    getIssuersNotifier,
    getContactsNotifier,
    getPaymentsNotifier,
    getPursesNotifier,
    acceptOffer,
    declineOffer,
    cancelOffer,
    makeEmptyPurse,
    addContact,
    addIssuer,
  });

  return walletBridge;
};
