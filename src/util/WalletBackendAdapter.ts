// @ts-check
import { iterateEach, iterateLatest } from '@agoric/casting';
import { AmountMath } from '@agoric/ertp';
import { objectMap } from '@agoric/internal';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
  observeNotifier,
} from '@agoric/notifier';
import {
  assertHasData,
  NO_SMART_WALLET_ERROR,
} from '@agoric/smart-wallet/src/utils';
import { E, ERef } from '@endo/eventual-send';
import { Far, Marshal } from '@endo/marshal';
import { querySwingsetParams } from '../util/querySwingsetParams';
import { getDappService } from '../service/Dapps';
import { getIssuerService } from '../service/Issuers';
import { getOfferService } from '../service/Offers';

import type { Amount, Brand, DisplayInfo } from '@agoric/ertp/src/types';
import type { Notifier } from '@agoric/notifier/src/types';
import type { OfferStatus } from '@agoric/smart-wallet/src/offers';
import type { UpdateRecord } from '@agoric/smart-wallet/src/smartWallet';
import type { Petname } from '@agoric/smart-wallet/src/types';
import type { SmartWalletKey } from '../store/Dapps';
import type { ValueFollower } from '@agoric/casting/src/follower-cosmjs';
import type { CurrentWalletRecord } from '@agoric/smart-wallet/src/smartWallet';
import { KeplrUtils } from '../contexts/Provider.jsx';
import type { PurseInfo } from '@agoric/web-components/src/keplr-connection/fetchCurrent';
import { HttpEndpoint } from '@cosmjs/tendermint-rpc';
import type { ValueFollowerElement } from '@agoric/casting/src/types';
import { queryBankBalances } from './queryBankBalances';
import type { Coin } from '@cosmjs/stargate';

const newId = kind => `${kind}${Math.random()}`;
const POLL_INTERVAL_MS = 6000;

export type BackendSchema = {
  actions: object;
  issuerSuggestions: Promise<AsyncIterator<any, any>>;
};

export const makeBackendFromWalletBridge = (
  walletBridge: ReturnType<typeof makeWalletBridgeFromFollowers>,
) => {
  const iterateNotifier = async <T>(notifier: ERef<Notifier<T>>) =>
    makeAsyncIterableFromNotifier(notifier)[Symbol.asyncIterator]();

  // XXX we don't have access to the board yet.
  const { notifier: servicesNotifier } = makeNotifierKit();

  const wrapOffersIterator = (offersMembers: AsyncIterator<any[], any[]>) =>
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

  const firstSchema: BackendSchema = harden({
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
      // @ts-expect-error xxx
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
  /** FIXME type {NotifierRecord<BackendSchema>} */
  const { notifier: backendNotifier, updater: backendUpdater } =
    makeNotifierKit(firstSchema);

  const backendIt = iterateNotifier(backendNotifier);

  const cancel = e => {
    backendUpdater.fail(e);
    walletBridge.cleanup();
  };

  return { backendIt, cancel };
};

export const makeWalletBridgeFromFollowers = (
  smartWalletKey: SmartWalletKey,
  rpc: HttpEndpoint,
  marshaller: Marshal<string>,
  currentFollower: ValueFollower<CurrentWalletRecord>,
  updateFollower: ValueFollower<UpdateRecord>,
  beansOwingFollower: ValueFollower<string>,
  vbankAssetsFollower: ValueFollower<unknown>,
  agoricBrandsFollower: ValueFollower<unknown>,
  keplrConnection: KeplrUtils,
  errorHandler = e => {
    // Make an unhandled rejection.
    throw e;
  },
  firstCallback: () => void | undefined = () => {},
) => {
  let isHalted = false;
  let isBankLoaded = false;
  let isSmartWalletLoaded = false;
  let isOfferServiceStarted = false;

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

  // We assume just one cosmos purse per brand.
  const brandToPurse = new Map<Brand, PurseInfo>();
  const pursePetnameToBrand = new Map<Petname, Brand>();

  const updatePurses = () => {
    console.debug('brandToPurse map', brandToPurse);
    const purses = [] as PurseInfo[];
    for (const [brand, purse] of brandToPurse.entries()) {
      if (purse.currentAmount && purse.brandPetname) {
        assert(purse.pursePetname, 'missing purse.pursePetname');
        pursePetnameToBrand.set(purse.pursePetname, brand);
        purses.push(purse);
      }
    }
    notifierKits.purses.updater.updateState(harden(purses));

    // Make sure the offer service has all purses from both bank and smart
    // wallet chainstorage.
    if (!isOfferServiceStarted && isBankLoaded && isSmartWalletLoaded) {
      isOfferServiceStarted = true;
      offerService.start(pursePetnameToBrand);
    }
  };

  const signSpendAction = async (data: string) => {
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

  const offersNotifer: Notifier<OfferStatus> =
    getNotifierMethods.getOffersNotifier();

  const offerService = getOfferService(
    smartWalletKey,
    signSpendAction,
    offersNotifer,
    marshaller,
  );

  const { notifier: beansOwingNotifier, updater: beansOwingUpdater } =
    makeNotifierKit<Number | null>(null);

  const watchBeansOwing = async () => {
    for await (const { value } of iterateLatest(beansOwingFollower)) {
      if (isHalted) return;
      beansOwingUpdater.updateState(Number(value));
    }
  };

  // Reads purses from the cosmos bank module. These are not necessarily real
  // "purses" in the smart wallet contract, because those are lazily
  // instantiated, but we still need to show the balances.
  const watchChainBalances = () => {
    let vbankAssets;
    let bank;

    const possiblyUpdateBankPurses = () => {
      if (!vbankAssets || !bank) return;

      const bankMap = new Map<string, string>(
        bank.map(({ denom, amount }) => [denom, amount]),
      );

      vbankAssets.forEach(([denom, info]) => {
        const amount = bankMap.get(denom) ?? 0n;
        const purseInfo: PurseInfo = {
          brand: info.brand,
          currentAmount: AmountMath.make(info.brand, BigInt(amount)),
          brandPetname: info.issuerName,
          pursePetname: info.issuerName,
          displayInfo: info.displayInfo,
        };
        brandToPurse.set(info.brand, purseInfo);
      });

      isBankLoaded = true;
      updatePurses();
    };

    const watchBank = async () => {
      if (isHalted) return;
      const balances = await queryBankBalances(keplrConnection.address, rpc);
      bank = balances;
      possiblyUpdateBankPurses();
      setTimeout(watchBank, POLL_INTERVAL_MS);
    };

    const watchVbankAssets = async () => {
      for await (const { value } of iterateLatest(vbankAssetsFollower)) {
        if (isHalted) return;
        vbankAssets = value;
        possiblyUpdateBankPurses();
      }
    };

    void watchVbankAssets();
    void watchBank();
  };

  const fetchAgoricBrands = async () => {
    for await (const { value } of iterateLatest(agoricBrandsFollower)) {
      if (value) {
        return new Map(
          (value as Array<[string, unknown]>).map(([k, v]) => [v, k]),
        );
      }
    }
  };

  const fetchCurrent = async () => {
    await assertHasData(currentFollower);
    void watchBeansOwing();
    watchChainBalances();

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
    const currentEl: ValueFollowerElement<CurrentWalletRecord> = latest.value;
    const wallet = currentEl.value;
    console.debug('wallet current', wallet);

    const agoricBrands = await fetchAgoricBrands();
    assert(agoricBrands, 'Failed to fetch agoric brands');

    for (const purse of wallet.purses) {
      // We only care about the zoe invite purse, which has asset kind 'set'.
      // Non 'set' amounts need to be fetched from vbank to know their
      // decimalPlaces.
      //
      // If we have add non 'set' amount purses that aren't in the vbank, it's
      // not currently possible to read their decimalPlaces, so this code
      // will need updating.
      if (
        !Array.isArray(purse.balance.value) ||
        !agoricBrands.has(purse.brand)
      ) {
        continue;
      }
      const brandDescriptor = {
        petname: agoricBrands.get(purse.brand) as Petname,
        displayInfo: { assetKind: 'set' },
      };
      const purseInfo: PurseInfo = {
        brand: purse.brand,
        currentAmount: purse.balance,
        brandPetname: brandDescriptor.petname,
        pursePetname: brandDescriptor.petname,
        displayInfo: brandDescriptor.displayInfo,
      };
      brandToPurse.set(purse.brand, purseInfo);
    }
    isSmartWalletLoaded = true;
    updatePurses();
    return currentEl.blockHeight;
  };

  const followLatest = async startingHeight => {
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
          throw Error(`Unknown updateRecord ${updateRecord}`);
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
    cleanup: () => (isHalted = true),
  });

  return walletBridge;
};
