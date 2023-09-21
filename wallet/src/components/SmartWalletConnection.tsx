import { makeFollower, makeLeader } from '@agoric/casting';
import {
  AgoricChainStoragePathKind as Kind,
  makeAgoricChainStorageWatcher,
} from '@agoric/rpc';
import { observeIterator } from '@agoric/notifier';
import { NO_SMART_WALLET_ERROR } from '@agoric/smart-wallet/src/utils';
import { makeImportContext } from '@agoric/smart-wallet/src/marshal-contexts';
import { Far } from '@endo/marshal';
import MuiAlert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { useEffect, useState, useMemo } from 'react';
import * as React from 'react';
import { DEFAULT_CONNECTION_CONFIGS } from '../util/connections';
import { maybeSave } from '../util/storage';

import {
  ConnectionStatus,
  withApplicationContext,
} from '../contexts/Application';
import {
  makeBackendFromWalletBridge,
  makeWalletBridgeFromFollowers,
} from '../util/WalletBackendAdapter';
import ProvisionDialog from './ProvisionDialog';

import type { MetricsNotification as ProvisionPoolMetrics } from '@agoric/vats/src/provisionPoolKit';
import type { ChainStorageWatcher } from '@agoric/rpc';

// @ts-expect-error xxx forwardRef
const Alert = React.forwardRef(function Alert({ children, ...props }, ref) {
  return (
    // @ts-expect-error xxx forwardRef
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props}>
      {children}
    </MuiAlert>
  );
});

export const useProvisionPoolMetrics = (watcher?: ChainStorageWatcher) => {
  const [data, setData] = useState<ProvisionPoolMetrics | null>(null);

  useEffect(
    () =>
      watcher?.watchLatest(
        [Kind.Data, 'published.provisionPool.metrics'],
        setData,
        e => console.error('error watching provision pool metrics', e),
      ),
    [watcher],
  );

  return data;
};

/**
 * Wallet UI doesn't use objects as presences, only as identities.
 * Use this to override the defaultMakePresence of makeImportContext.
 *
 * @param iface
 */
const inertPresence = (iface: string) =>
  Far(iface.replace(/^Alleged: /, ''), {});

const SmartWalletConnection = ({
  connectionConfig,
  setConnectionStatus,
  setBackend,
  setBackendErrorHandler,
  keplrConnection,
  allConnectionConfigs,
  tryKeplrConnect,
  swingsetParams,
}) => {
  const [snackbarMessages, setSnackbarMessages] = useState<any[]>([]);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);

  const onProvisionDialogClose = () => {
    setProvisionDialogOpen(false);
  };

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessages(sm => sm.slice(1));
  };

  const showError = (message, e, severity = 'error') => {
    if (e) {
      console.error(`${message}:`, e);
      message += `: ${e.message}`;
    }
    if (severity === 'error') {
      setConnectionStatus(ConnectionStatus.Error);
    }
    setSnackbarMessages(sm => [...sm, { severity, message }]);
  };

  const { href } = connectionConfig;

  const publicAddress = (() => {
    if (keplrConnection) {
      return keplrConnection.address;
    }
    return undefined;
  })();

  const backendError = e => {
    if (e.message === NO_SMART_WALLET_ERROR) {
      setProvisionDialogOpen(true);
      setConnectionStatus(ConnectionStatus.Error);
    } else {
      setBackend(null);
      showError('Error in wallet backend', e);
    }
  };

  const [context, leader] = useMemo(
    () => [makeImportContext(inertPresence), makeLeader(href)],
    [connectionConfig, keplrConnection],
  );

  const storageWatcher = useMemo(() => {
    if (!keplrConnection) return undefined;

    return makeAgoricChainStorageWatcher(
      keplrConnection.rpc,
      keplrConnection.chainId,
      backendError,
      context.fromBoard,
    );
  }, [keplrConnection, context]);

  const provisionPoolData = useProvisionPoolMetrics(storageWatcher);

  useEffect(() => {
    maybeSave('connectionConfig', connectionConfig);

    const updatedConnectionConfigs: any[] = [];

    for (const config of allConnectionConfigs) {
      const found = DEFAULT_CONNECTION_CONFIGS.find(
        defaultConfig => defaultConfig.href === config.href,
      );
      if (!found) {
        updatedConnectionConfigs.push(config);
      }
    }
    maybeSave('userConnectionConfigs', updatedConnectionConfigs);

    if (connectionConfig) {
      tryKeplrConnect().catch(reason => {
        console.error('tryKeplrConnect failed', reason);
        setConnectionStatus(ConnectionStatus.Error);
      });
    }
  }, [connectionConfig]);

  useEffect(() => {
    if (!connectionConfig || !keplrConnection || !storageWatcher) {
      return undefined;
    }

    let cancelIterator;

    const follow = async () => {
      const followPublished = <T extends {}>(path) =>
        makeFollower<T>(`:published.${path}`, leader, {
          // @ts-expect-error FarRef not needed
          unserializer: context.fromMyWallet,
          proof: 'none',
        });

      const bridge = makeWalletBridgeFromFollowers(
        {
          chainId: keplrConnection.chainId,
          address: publicAddress,
        },
        keplrConnection.rpc,
        context.fromBoard,
        followPublished(`wallet.${publicAddress}.current`),
        followPublished(`wallet.${publicAddress}`),
        storageWatcher,
        keplrConnection,
        backendError,
        () => {
          setConnectionStatus(ConnectionStatus.Connected);
          setProvisionDialogOpen(false);
        },
      );
      const { backendIt, cancel } = makeBackendFromWalletBridge(bridge);
      cancelIterator = cancel;
      // Need to thunk the error handler, or it gets called immediately.
      setBackendErrorHandler(() => backendError);
      return observeIterator(backendIt, {
        updateState: be => {
          cancelIterator && setBackend(be);
        },
        fail: e => {
          cancelIterator && backendError(e);
        },
        finish: be => {
          cancelIterator && setBackend(be);
        },
      });
    };
    follow().catch(e => showError('Cannot read Smart Wallet casting', e));

    return () => {
      cancelIterator && cancelIterator();
      cancelIterator = undefined;
    };
  }, [connectionConfig, keplrConnection]);

  const creationFee =
    swingsetParams &&
    Number(
      swingsetParams.powerFlagFees?.find(
        ({ powerFlag }) => powerFlag === 'SMART_WALLET',
      )?.fee[0]?.amount ?? 0,
    );

  return (
    <div>
      <Snackbar open={snackbarMessages.length > 0}>
        {/* @ts-expect-error xxx */}
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarMessages[0]?.severity}
          sx={{ width: '100%' }}
        >
          {snackbarMessages[0]?.message}
        </Alert>
      </Snackbar>
      <ProvisionDialog
        open={provisionDialogOpen}
        onClose={onProvisionDialogClose}
        provisionPoolData={provisionPoolData}
        creationFee={creationFee}
        address={publicAddress}
        href={href}
      />
    </div>
  );
};

export default withApplicationContext(SmartWalletConnection, context => ({
  connectionConfig: context.connectionConfig,
  setConnectionStatus: context.setConnectionStatus,
  setBackend: context.setBackend,
  setBackendErrorHandler: context.setBackendErrorHandler,
  keplrConnection: context.keplrConnection,
  allConnectionConfigs: context.allConnectionConfigs,
  tryKeplrConnect: context.tryKeplrConnect,
  swingsetParams: context.swingsetParams,
}));
