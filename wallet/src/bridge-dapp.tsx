// @ts-check
import '@endo/eventual-send/shim';
import './lockdown';

import { useEffect } from 'react';
import * as ReactDOM from 'react-dom';
import { BridgeProtocol } from '@agoric/web-components';
import { addOffer, OfferUIStatus } from './store/Offers';
import { loadDapp, upsertDapp, watchDapps } from './store/Dapps';
import type { DappKey } from './store/Dapps';
import type { OfferConfig } from '@agoric/web-components/src/dapp-wallet-bridge/DappWalletBridge';

Error.stackTraceLimit = Infinity;

/**
 * Sends a message to the dapp in the parent window.
 */
const sendMessage = payload => window.parent.postMessage(payload, '*');

/**
 * Ensures this bridge is being loaded inside another window.
 */
const checkParentWindow = () => {
  const me = window;
  const { parent } = window;
  if (me === parent) {
    throw Error('window.parent === parent!!!');
  }
};

/**
 * Requests a dapp at a given origin to connect to the wallet UI. This will
 * prompt the user to accept the dapp in the wallet and allow it to propose
 * offers if accepted.
 *
 * @param dappKey
 * @param proposedPetname - The suggested petname if the wallet does
 * not already know about the dapp.
 */
const requestDappConnection = (dappKey: DappKey, proposedPetname: string) => {
  const dapp = loadDapp(dappKey);
  if (dapp) {
    return;
  }
  upsertDapp(dappKey.smartWalletKey, {
    origin: dappKey.origin,
    petname: proposedPetname,
  });
};

/**
 * Watches for changes in local storage to the dapp's approval status and
 * notifies the dapp.
 */
const watchDappApproval = (dappKey: DappKey, currentlyApproved: boolean) => {
  watchDapps(dappKey.smartWalletKey, dapps => {
    const dapp = dapps.find(d => d.origin === dappKey.origin);
    const isDappApproved = !!dapp?.isEnabled;
    if (isDappApproved !== currentlyApproved) {
      sendMessage({
        type: BridgeProtocol.dappApprovalChanged,
        isDappApproved,
      });
      currentlyApproved = isDappApproved;
    }
  });
};

/**
 * Propose an offer from the dapp to the wallet UI.
 */
const createAndAddOffer = (dappKey: DappKey, offerConfig: OfferConfig) => {
  const dapp = loadDapp(dappKey);
  const isDappApproved = !!dapp?.isEnabled;
  if (!isDappApproved) return;

  const currentTime = new Date().getTime();
  // TODO(https://github.com/Agoric/agoric-sdk/issues/6478): Generate separate
  // id for transaction when signing.
  const id = currentTime;

  const offer = {
    id,
    requestContext: { origin: dappKey.origin },
    status: OfferUIStatus.proposed,
    ...offerConfig,
  };
  addOffer(dappKey.smartWalletKey, offer);
};

/**
 * Notifies the dapp about whether it's approved or not and watches for changes
 * to its approval status.
 *
 * @param dappKey
 */
const checkAndWatchDappApproval = (dappKey: DappKey) => {
  // Dapps are keyed by origin. A dapp is basically an origin with a petname
  // and an approval status.
  const dapp = loadDapp(dappKey);
  const isDappApproved = !!dapp?.isEnabled;
  sendMessage({
    type: BridgeProtocol.checkIfDappApproved,
    isDappApproved,
  });
  watchDappApproval(dappKey, isDappApproved);
};

const handleIncomingMessages = () => {
  let dappKey: DappKey | undefined;

  window.addEventListener('message', ev => {
    const type = ev.data?.type;
    if (!type?.startsWith(BridgeProtocol.prefix)) {
      return;
    }
    if (dappKey === undefined) {
      const origin = ev.origin;
      const chainId = ev.data?.chainId;
      const address = ev.data?.address;
      assert.equal(
        type,
        BridgeProtocol.checkIfDappApproved,
        `First message from dapp should be type ${BridgeProtocol.checkIfDappApproved}`,
      );
      assert.string(
        address,
        'First message from dapp should include an address',
      );
      assert.string(
        chainId,
        'First message from dapp should include a chainId',
      );
      const smartWalletKey = { chainId, address };
      dappKey = { smartWalletKey, origin };
      console.debug('bridge connected with dapp', dappKey);
    }

    switch (type) {
      case BridgeProtocol.requestDappConnection:
        requestDappConnection(dappKey, ev.data?.petname);
        break;
      case BridgeProtocol.checkIfDappApproved:
        checkAndWatchDappApproval(dappKey);
        break;
      case BridgeProtocol.addOffer:
        createAndAddOffer(dappKey, ev.data?.offerConfig);
        break;
      default:
        break;
    }
  });
};

const connectDapp = async () => {
  if (!('localStorage' in window)) {
    throw new Error('No access to localStorage');
  }
  checkParentWindow();
  handleIncomingMessages();
  sendMessage({
    type: BridgeProtocol.loaded,
  });
};

const sendAccessError = (err: Error) => {
  sendMessage({
    type: BridgeProtocol.error,
    message: err.message,
  });
};

const Bridge = () => {
  useEffect(() => {
    connectDapp().catch(sendAccessError);
  }, []);

  return <></>;
};

ReactDOM.render(<Bridge />, document.getElementById('root'));
