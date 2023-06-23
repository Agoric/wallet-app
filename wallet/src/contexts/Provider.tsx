import { observeIterator } from '@agoric/notifier';
import { E } from '@endo/far';
import * as React from 'react';
import { useEffect, useState, useReducer } from 'react';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Random } from '@cosmjs/crypto';
import { ApplicationContext, ConnectionStatus } from './Application';

import {
  DEFAULT_CONNECTION_CONFIGS,
  KnownNetworkConfigUrls,
} from '../util/connections';
import { maybeLoad } from '../util/storage';
import { suggestChain } from '../util/SuggestChain';
import {
  BackgroundSigner,
  InteractiveSigner,
  makeBackgroundSigner,
  makeInteractiveSigner,
} from '../util/keyManagement';
import { onLoadP } from '../util/onLoad';
import { DappWithActions } from '../service/Dapps';

import type { Params as CosmicSwingsetParams } from '@agoric/cosmic-proto/dist/agoric/swingset/swingset';
import type { BackendSchema } from '../util/WalletBackendAdapter';
import { PurseInfo } from '../service/Offers';
import { AssetKind } from '@agoric/ertp';

export type KeplrUtils = {
  address: string;
  chainId: string;
  signers: {
    interactiveSigner: InteractiveSigner;
    backgroundSigner: BackgroundSigner;
  };
};

const useDebugLogging = (state, watch) => {
  useEffect(() => console.debug('useDebugLogging', { state }), watch);
};

const cmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const kv = (keyObj, val) => {
  const key = Object.values(keyObj)[0];
  const text = Array.isArray(key) ? key.join('.') : key;
  const id = val.meta?.id;
  return { ...val, ...keyObj, id: id ?? text, text, value: val };
};

const inboxReducer = (_, newInbox) => {
  console.log('got inbox', newInbox);
  return (
    newInbox
      ?.map(tx => ({
        ...tx,
        offerId: tx.id,
      }))
      .sort((a, b) => a.id - b.id) || null
  );
};

const pursesReducer = (
  _currentPurses: PurseInfo[] | null,
  newPurses: PurseInfo[] | null,
) => {
  if (newPurses === null) return null;

  const natPurses = newPurses.filter(
    p => p.displayInfo?.assetKind === AssetKind.NAT,
  );

  const otherPurses = newPurses.filter(
    p => p.displayInfo?.assetKind !== AssetKind.NAT,
  );

  const sortByPetname = (purses: PurseInfo[]) =>
    purses
      .map(purse => kv({ pursePetname: purse.pursePetname }, purse))
      .sort(
        (a, b) =>
          cmp(a.brandPetname, b.brandPetname) ||
          cmp(a.pursePetname, b.pursePetname),
      ) || null;

  return [...sortByPetname(natPurses), ...sortByPetname(otherPurses)];
};

const dappsReducer = (_, newDapps: DappWithActions[] | null) =>
  newDapps
    ?.map(dapp => ({ ...dapp, id: dapp.origin }))
    .sort((a, b) => cmp(a.petname, b.petname)) || null;

const contactsReducer = (_, newContacts) =>
  newContacts
    ?.map(([contactPetname, contact]) => kv({ contactPetname }, contact))
    .sort((a, b) => cmp(a.contactPetname, b.contactPetname) || a.id - b.id) ||
  null;

const issuersReducer = (_, newIssuers) =>
  newIssuers
    ?.map(([issuerPetname, issuer]) => kv({ issuerPetname }, issuer))
    .sort((a, b) => a.id - b.id) || null;

const paymentsReducer = (_, newPayments) =>
  newPayments
    ?.map(payment => ({ ...payment, id: payment.meta.id }))
    .sort((a, b) => a.id - b.id) || null;

const pendingPurseCreationsReducer = (
  pendingPurseCreations,
  { issuerId, isPending },
) => {
  if (isPending) pendingPurseCreations.add(issuerId);
  else pendingPurseCreations.delete(issuerId);

  return new Set(pendingPurseCreations);
};

const pendingTransfersReducer = (pendingTransfers, { purseId, isPending }) => {
  if (isPending) pendingTransfers.add(purseId);
  else pendingTransfers.delete(purseId);

  return new Set(pendingTransfers);
};

const pendingOffersReducer = (pendingOffers, { offerId, isPending }) => {
  if (isPending) pendingOffers.add(offerId);
  else pendingOffers.delete(offerId);

  return new Set(pendingOffers);
};

const declinedOffersReducer = (declinedOffers, { offerId, isDeclined }) => {
  if (isDeclined) declinedOffers.add(offerId);
  else declinedOffers.delete(offerId);

  return new Set(declinedOffers);
};

const closedOffersReducer = (closedOffers, { offerId, isClosed }) => {
  if (isClosed) closedOffers.add(offerId);
  else closedOffers.delete(offerId);

  return new Set(closedOffers);
};

const Provider = ({ children }) => {
  const [inbox, setInbox] = useReducer(inboxReducer, null);
  const [purses, setPurses] = useReducer(pursesReducer, null);
  const [dapps, setDapps] = useReducer(dappsReducer, null);
  const [contacts, setContacts] = useReducer(contactsReducer, null);
  const [payments, setPayments] = useReducer(paymentsReducer, null);
  const [issuers, setIssuers] = useReducer(issuersReducer, null);
  const [issuerSuggestions, setIssuerSuggestions] = useState(null);
  const [services, setServices] = useState(null);
  const [swingsetParams, setSwingsetParams] =
    useState<CosmicSwingsetParams | null>(null);
  const [beansOwing, setBeansOwing] = useState<string | null>(null);
  const [backend, setBackend] = useState<BackendSchema | null>(null);
  const [schemaActions, setSchemaActions] = useState<Promise<
    BackendSchema['actions']
  > | null>(null);
  const [backendErrorHandler, setBackendErrorHandler] = useState(null);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  // expose for development
  // @ts-expect-error window keys
  window.setPreviewEnabled = setPreviewEnabled;

  const RESTORED_CONNECTION_CONFIGS = [...DEFAULT_CONNECTION_CONFIGS];
  const userConnectionConfigs = maybeLoad('userConnectionConfigs');
  if (userConnectionConfigs) {
    RESTORED_CONNECTION_CONFIGS.unshift(...userConnectionConfigs);
  }
  const restoredConnectionConfig = maybeLoad('connectionConfig') || null;

  const [connectionConfig, setConnectionConfig] = useState(
    restoredConnectionConfig || { href: KnownNetworkConfigUrls.main },
  );
  const [allConnectionConfigs, setAllConnectionConfigs] = useState([
    ...RESTORED_CONNECTION_CONFIGS,
  ]);

  const [wantConnection, setWantConnection] = useState(
    restoredConnectionConfig !== null,
  );
  const [connectionStatus, setConnectionStatus] = useState(
    wantConnection
      ? ConnectionStatus.Connecting
      : ConnectionStatus.Disconnected,
  );
  const [keplrConnection, setKeplrConnection] = useState<KeplrUtils | null>(
    null,
  );

  /**
   * NOTE: relies on ambient window.fetch, window.keplr, Random.getBytes
   */
  const tryKeplrConnect = async () => {
    await onLoadP;
    // @ts-expect-error window keys
    const { keplr, fetch } = window;
    assert(fetch, 'Missing window.fetch');
    assert(keplr, 'Missing window.keplr');
    const { getBytes } = Random;

    const chainInfo = await suggestChain(connectionConfig.href, {
      fetch,
      keplr,
      random: Math.random,
    });
    const offlineSigner = keplr.getOfflineSigner(chainInfo.chainId);

    const accounts = await offlineSigner.getAccounts();

    const [interactiveSigner, backgroundSigner] = await Promise.all([
      makeInteractiveSigner(
        chainInfo,
        keplr,
        SigningStargateClient.connectWithSigner,
      ),
      makeBackgroundSigner({
        localStorage,
        csprng: getBytes,
      }),
    ]);
    setKeplrConnection({
      address: accounts[0]?.address,
      signers: { interactiveSigner, backgroundSigner },
      chainId: chainInfo.chainId,
      // @ts-expect-error used?
      rpc: chainInfo.rpc,
    });
  };

  // @ts-expect-error xxx
  const backendSetters = new Map([
    ['services', setServices],
    ['offers', setInbox],
    ['purses', setPurses],
    ['contacts', setContacts],
    ['payments', setPayments],
    ['issuers', setIssuers],
    ['dapps', setDapps],
  ]);

  // Resubscribe when a new backend is set.
  useEffect(() => {
    setSwingsetParams(null);
    setBeansOwing(null);
    setSchemaActions(null);
    for (const setter of backendSetters.values()) {
      setter(null);
    }

    if (!backend) {
      return () => {};
    }

    let cancelIteration: Error | null = null;
    const rethrowIfNotCancelled = e => {
      if (e !== cancelIteration) {
        throw e;
      }
    };
    setSchemaActions(E.get(backend).actions);
    for (const [prop, setter] of backendSetters.entries()) {
      const iterator = E.get(backend)[prop];
      observeIterator(iterator, {
        fail: rethrowIfNotCancelled,
        updateState: state => {
          if (cancelIteration) {
            throw cancelIteration;
          }
          setter(state);
        },
      }).catch(rethrowIfNotCancelled);
    }

    const issuerSuggestionsNotifier = E.get(backend).issuerSuggestions;
    observeIterator(issuerSuggestionsNotifier, {
      fail: rethrowIfNotCancelled,
      updateState: state => {
        if (cancelIteration) {
          throw cancelIteration;
        }
        setIssuerSuggestions(state);
      },
    }).catch(rethrowIfNotCancelled);

    const beansOwingNotifier = E.get(backend).beansOwing;
    observeIterator(beansOwingNotifier, {
      fail: rethrowIfNotCancelled,
      updateState: state => {
        if (cancelIteration) {
          throw cancelIteration;
        }
        setBeansOwing(state);
      },
    }).catch(rethrowIfNotCancelled);

    E.get(backend)
      .swingsetParams.then(params => {
        if (cancelIteration) {
          throw cancelIteration;
        }
        if (params === undefined) {
          rethrowIfNotCancelled(new Error('swingset params undefined'));
        }
        assert(params);
        setSwingsetParams(params);
      })
      .catch(rethrowIfNotCancelled);

    return () => {
      cancelIteration = Error('cancelled');
    };
  }, [backend]);

  const disconnect = wantReconnect => {
    setBackend(null);
    setConnectionStatus(ConnectionStatus.Disconnected);
    if (typeof wantReconnect === 'boolean') {
      setWantConnection(wantReconnect);
    }
  };

  const [pendingPurseCreations, setPendingPurseCreations] = useReducer(
    pendingPurseCreationsReducer,
    new Set(),
  );
  const [pendingTransfers, setPendingTransfers] = useReducer(
    pendingTransfersReducer,
    new Set(),
  );

  // Eager set of pending offer ids.
  const [pendingOffers, setPendingOffers] = useReducer(
    pendingOffersReducer,
    new Set(),
  );

  // Eager set of declined offer ids.
  const [declinedOffers, setDeclinedOffers] = useReducer(
    declinedOffersReducer,
    new Set(),
  );

  // Set of closed offers. Allows eagerly declined offers to be closed while
  // still pending.
  const [closedOffers, setClosedOffers] = useReducer(
    closedOffersReducer,
    new Set(),
  );

  const state = {
    schemaActions,
    setBackend,
    services,
    setServices,
    inbox,
    setInbox,
    purses,
    setPurses,
    dapps,
    setDapps,
    contacts,
    setContacts,
    payments,
    setPayments,
    issuers,
    setIssuers,
    issuerSuggestions,
    pendingPurseCreations,
    setPendingPurseCreations,
    pendingTransfers,
    setPendingTransfers,
    pendingOffers,
    setPendingOffers,
    declinedOffers,
    setDeclinedOffers,
    closedOffers,
    setClosedOffers,
    setWantConnection,
    wantConnection,
    connectionConfig,
    setConnectionConfig,
    allConnectionConfigs,
    setAllConnectionConfigs,
    disconnect,
    connectionStatus,
    setConnectionStatus,
    backendErrorHandler,
    setBackendErrorHandler,
    keplrConnection,
    tryKeplrConnect,
    previewEnabled,
    swingsetParams,
    beansOwing,
  };

  useDebugLogging(state, [
    schemaActions,
    inbox,
    purses,
    dapps,
    contacts,
    payments,
    issuers,
    pendingPurseCreations,
    services,
    pendingTransfers,
    pendingOffers,
    declinedOffers,
    closedOffers,
    previewEnabled,
  ]);

  return (
    <ApplicationContext.Provider value={state}>
      {children}
    </ApplicationContext.Provider>
  );
};

export default Provider;
