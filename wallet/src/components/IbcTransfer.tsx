/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { parseAsValue } from '@agoric/ui-components';
import { withApplicationContext } from '../contexts/Application';
import { ibcAssets } from '../util/ibc-assets';
import { stringifyPurseValue } from '@agoric/ui-components';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import { Box } from '@mui/system';
import { fromBech32 } from '@cosmjs/encoding';
import { queryBankBalances } from '../util/queryBankBalances';
import { isDeliverTxSuccess } from '@cosmjs/stargate';
import { CircularProgress, Link, Snackbar, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import PetnameSpan from './PetnameSpan';
import { sendIbcTokens, withdrawIbcTokens } from '../util/ibcTransfer';
import type { PurseInfo } from '../service/Offers';
import type { KeplrUtils } from '../contexts/Provider';
import type { Petname } from '@agoric/smart-wallet/src/types';
import * as React from 'react';

export enum IbcDirection {
  Deposit,
  Withdrawal,
}

const unmodifiableAddressStyle = {
  width: 420,
  '& .Mui-disabled': {
    // XXX last resort to override internal component styles.
    color: 'rgba(0,0,0,0.6) !important',
    '-webkit-text-fill-color': 'inherit',
  },
  '& input.Mui-disabled': {
    // XXX last resort to override internal component styles.
    color: 'rgba(0,0,0,0.86) !important',
  },
};

const titlePreposition = {
  [IbcDirection.Deposit]: 'from',
  [IbcDirection.Withdrawal]: 'to',
};

const agoricAddressLabel = {
  [IbcDirection.Deposit]: 'To',
  [IbcDirection.Withdrawal]: 'From',
};

const remoteChainAddressLabel = {
  [IbcDirection.Deposit]: 'From',
  [IbcDirection.Withdrawal]: 'To',
};

const actionName = {
  [IbcDirection.Deposit]: 'Deposit',
  [IbcDirection.Withdrawal]: 'Withdraw',
};

interface Params {
  isShowing: boolean;
  purse?: PurseInfo;
  direction: IbcDirection;
  handleClose: () => void;
  keplrConnection: KeplrUtils;
}

const agoricExplorerPath = 'agoric';

const useRemoteChainAccount = (
  direction: IbcDirection,
  isShowing: boolean,
  brandPetname?: Petname,
) => {
  const brandPetnameAsKey = Array.isArray(brandPetname)
    ? brandPetname.join('.')
    : brandPetname;
  const ibcAsset = brandPetnameAsKey ? ibcAssets[brandPetnameAsKey] : undefined;

  const [
    brandsWithKeplrConnectionsInProgress,
    setBrandsWithKeplrConnectionsInProgress,
  ] = useState(new Set());
  const isKeplrConnectionInProgress =
    brandsWithKeplrConnectionsInProgress.has(brandPetnameAsKey);

  const setBrandKeplrConnectionInProgress = (inProgress: boolean) => {
    setBrandsWithKeplrConnectionsInProgress(brandKeys => {
      if (inProgress) {
        return new Set([...brandKeys, brandPetnameAsKey]);
      }

      return new Set([...brandKeys].filter(k => k !== brandPetnameAsKey));
    });
  };

  const [remoteChainSigners, setRemoteChainSigners] = useState({});
  const remoteChainSigner = brandPetnameAsKey
    ? remoteChainSigners[brandPetnameAsKey] ?? null
    : null;

  const setRemoteChainSigner = signer =>
    brandPetnameAsKey &&
    setRemoteChainSigners(signers => ({
      ...signers,
      [brandPetnameAsKey]: signer,
    }));

  const [remoteChainAddresses, setRemoteChainAddresses] = useState({});
  const remoteChainAddress = brandPetnameAsKey
    ? remoteChainAddresses[brandPetnameAsKey] ?? ''
    : '';

  const setRemoteChainAddress = address =>
    brandPetnameAsKey &&
    setRemoteChainAddresses(addresses => ({
      ...addresses,
      [brandPetnameAsKey]: address,
    }));

  const [remoteChainBalances, setRemoteChainBalances] = useState({});
  const remoteChainBalance = brandPetnameAsKey
    ? remoteChainBalances[brandPetnameAsKey] ?? null
    : null;

  const setRemoteChainBalance = balance =>
    brandPetnameAsKey &&
    setRemoteChainBalances(balances => ({
      ...balances,
      [brandPetnameAsKey]: balance,
    }));

  const connectWithKeplr = async () => {
    assert(ibcAsset && brandPetnameAsKey);
    if (isKeplrConnectionInProgress) return;

    // @ts-expect-error window keys
    const { keplr } = window;
    setBrandKeplrConnectionInProgress(true);
    try {
      const offlineSigner = await keplr.getOfflineSignerOnlyAmino(
        ibcAsset.chainInfo.chainId,
      );

      const accounts = await offlineSigner.getAccounts();
      if (accounts.length > 1) {
        // Currently, Keplr extension manages only one address/public key pair.
        console.warn('Got multiple accounts from Keplr. Using first of list.');
      }
      setRemoteChainAddress(accounts[0].address);
      setRemoteChainSigner(offlineSigner);
    } catch (e) {
      console.error('Keplr connection error', e);
    } finally {
      setBrandKeplrConnectionInProgress(false);
    }
  };

  useEffect(() => {
    if (isShowing && brandPetname && direction === IbcDirection.Deposit) {
      void connectWithKeplr();
    }
  }, [brandPetname, isShowing, direction]);

  const isRemoteChainAddressValid = useMemo(() => {
    if (!remoteChainAddress) return false;

    try {
      const { prefix } = fromBech32(remoteChainAddress);
      return prefix === ibcAsset?.chainInfo.addressPrefix;
    } catch {
      return false;
    }
  }, [remoteChainAddress, ibcAsset]);

  useEffect(() => {
    setRemoteChainBalance(null);
    if (!isRemoteChainAddressValid || !ibcAsset) return;

    let isCancelled = false;

    const loadRemoteChainBalance = async () => {
      const balances = await queryBankBalances(
        remoteChainAddress,
        /* @ts-expect-error rpc string */
        ibcAsset.chainInfo.rpc,
      );
      if (isCancelled) return;

      const balance = balances.find(
        ({ denom }) => denom === ibcAsset.deposit.denom,
      );

      setRemoteChainBalance(balance ? BigInt(balance.amount) : 0n);
    };

    void loadRemoteChainBalance();

    return () => {
      isCancelled = true;
    };
  }, [remoteChainAddress, isRemoteChainAddressValid, ibcAsset]);

  return {
    remoteChainBalance,
    isRemoteChainAddressValid,
    connectWithKeplr,
    remoteChainAddress,
    remoteChainSigner,
    isKeplrConnectionInProgress,
    setRemoteChainAddress: (address: string) => {
      setRemoteChainAddress(address);
    },
  };
};

const useSnackbar = () => {
  const [{ isSnackbarOpen, snackbarMessage }, setSnackbarState] = useState({
    isSnackbarOpen: false,
    snackbarMessage: <></>,
  });

  const handleCloseSnackbar = (
    _event: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarState(state => ({ ...state, isSnackbarOpen: false }));
  };

  const showSnackbar = (
    isSuccess: boolean,
    explorerPath: string,
    transactionHash: string,
  ) =>
    setSnackbarState({
      snackbarMessage: (
        <>
          Transaction {isSuccess ? 'succeeded' : 'failed'}:{' '}
          <Link
            color="rgb(0, 176, 255)"
            href={`https://${explorerPath}.explorers.guru/transaction/${transactionHash}`}
            target={transactionHash}
          >
            ...{transactionHash.slice(transactionHash.length - 12)}
          </Link>
        </>
      ),
      isSnackbarOpen: true,
    });

  return { isSnackbarOpen, snackbarMessage, handleCloseSnackbar, showSnackbar };
};

// Exported for testing only.
export const IbcTransferInternal = ({
  isShowing,
  purse,
  handleClose,
  direction,
  keplrConnection,
}: Params) => {
  const ibcAsset =
    typeof purse?.brandPetname === 'string'
      ? ibcAssets[purse.brandPetname]
      : undefined;

  const purseBalance = purse?.currentAmount.value;

  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const { showSnackbar, handleCloseSnackbar, isSnackbarOpen, snackbarMessage } =
    useSnackbar();

  const {
    connectWithKeplr,
    setRemoteChainAddress,
    isRemoteChainAddressValid,
    remoteChainBalance,
    remoteChainAddress,
    remoteChainSigner,
    isKeplrConnectionInProgress,
  } = useRemoteChainAccount(direction, isShowing, purse?.brandPetname);

  const handleAmountChange = e => {
    setAmount(e.target.value);
  };

  const isAmountInvalid = useMemo(() => {
    switch (direction) {
      case IbcDirection.Withdrawal:
        try {
          const val = parseAsValue(
            amount,
            purse?.displayInfo?.assetKind,
            purse?.displayInfo?.decimalPlaces,
          );
          return val === 0n || val > (purseBalance ?? 0n);
        } catch {
          return true;
        }
      case IbcDirection.Deposit:
        try {
          const val = parseAsValue(
            amount,
            purse?.displayInfo?.assetKind,
            purse?.displayInfo?.decimalPlaces,
          );
          return val === 0n || val > (remoteChainBalance ?? 0n);
        } catch {
          return true;
        }
    }
  }, [amount, purse, purseBalance]);

  useEffect(() => {
    if (isShowing) {
      setInProgress(false);
      setError('');
      setAmount('');
      setRemoteChainAddress('');
    }
  }, [isShowing]);

  const close = () => {
    handleClose();
  };

  const send = async () => {
    setError('');

    let val: string;
    try {
      assert(ibcAsset);
      val = String(
        parseAsValue(
          amount,
          purse?.displayInfo?.assetKind,
          purse?.displayInfo?.decimalPlaces,
        ),
      );
    } catch (e) {
      setError(String(e));
      return;
    }

    setInProgress(true);
    try {
      if (direction === IbcDirection.Deposit) {
        assert(remoteChainSigner && keplrConnection);
        const {
          chainInfo: { rpc, gas, explorerPath },
          deposit,
        } = ibcAsset;

        const res = await sendIbcTokens(
          deposit,
          rpc,
          remoteChainSigner,
          val,
          remoteChainAddress,
          keplrConnection.address,
          gas,
        );

        close();
        showSnackbar(
          isDeliverTxSuccess(res),
          explorerPath,
          res.transactionHash,
        );
      } else if (direction === IbcDirection.Withdrawal) {
        const { withdraw } = ibcAsset;

        const res = await withdrawIbcTokens(
          withdraw,
          val,
          keplrConnection.address,
          remoteChainAddress,
        );

        close();
        showSnackbar(
          isDeliverTxSuccess(res),
          agoricExplorerPath,
          res.transactionHash,
        );
      } else {
        throw new Error('Unrecognized IBC transfer direction', direction);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setInProgress(false);
    }
  };

  const agoricAddressInfo = (
    <TextField
      sx={{
        marginBottom: 2,
        ...unmodifiableAddressStyle,
      }}
      margin="dense"
      label={agoricAddressLabel[direction]}
      fullWidth
      variant="standard"
      value={keplrConnection?.address}
      disabled
      helperText={
        <>
          Balance Available:{' '}
          {purse?.currentAmount &&
            purse?.displayInfo &&
            stringifyPurseValue({
              value: purseBalance,
              displayInfo: purse?.displayInfo,
            })}
        </>
      }
    />
  );

  const remoteChainAddressInfo = remoteChainSigner ? (
    <TextField
      sx={unmodifiableAddressStyle}
      margin="dense"
      label={remoteChainAddressLabel[direction]}
      fullWidth
      variant="standard"
      value={remoteChainAddress}
      disabled
      helperText={
        remoteChainBalance !== null ? (
          <>
            Balance Available:{' '}
            {purse?.currentAmount &&
              purse?.displayInfo &&
              stringifyPurseValue({
                value: remoteChainBalance,
                displayInfo: purse?.displayInfo,
              })}
          </>
        ) : (
          'Fetching balance...'
        )
      }
    />
  ) : (
    <Box sx={{ marginTop: '6px' }}>
      <Typography fontSize={12} sx={{ color: 'rgba(0,0,0,0.6)' }}>
        From
      </Typography>
      <Button
        // So we can keep the non-disabled styling.
        aria-disabled={isKeplrConnectionInProgress}
        onClick={() => isKeplrConnectionInProgress || connectWithKeplr()}
        variant="outlined"
        sx={{ marginTop: '10px', marginBottom: '12px' }}
      >
        Use Keplr{' '}
        {isKeplrConnectionInProgress && (
          <CircularProgress
            aria-label="connection in progress"
            sx={{ marginLeft: 1 }}
            size="16px"
          ></CircularProgress>
        )}
      </Button>
    </Box>
  );

  const sender = (() => {
    switch (direction) {
      case IbcDirection.Withdrawal:
        return agoricAddressInfo;
      case IbcDirection.Deposit:
        return remoteChainAddressInfo;
    }
  })();

  const remoteChainAddressInput = (
    <TextField
      sx={{ width: 420 }}
      margin="dense"
      label={remoteChainAddressLabel[direction]}
      fullWidth
      variant="standard"
      value={remoteChainAddress}
      onChange={e => setRemoteChainAddress(e.target.value)}
      disabled={direction === IbcDirection.Deposit}
      error={!isRemoteChainAddressValid}
      helperText={
        isRemoteChainAddressValid ? (
          remoteChainBalance !== null ? (
            <>
              Balance Available:{' '}
              {purse?.currentAmount &&
                purse?.displayInfo &&
                stringifyPurseValue({
                  value: remoteChainBalance,
                  displayInfo: purse?.displayInfo,
                })}
            </>
          ) : (
            'Fetching balance...'
          )
        ) : remoteChainAddress ? (
          'Invalid Address'
        ) : (
          'Enter Address'
        )
      }
      InputProps={{
        type: 'text',
        autoComplete: 'off',
        endAdornment: !isRemoteChainAddressValid && (
          <InputAdornment position="end">
            <Button size="small" onClick={() => connectWithKeplr()}>
              Use Keplr
            </Button>
          </InputAdornment>
        ),
      }}
    />
  );

  const recipient = (() => {
    switch (direction) {
      case IbcDirection.Deposit:
        return agoricAddressInfo;
      case IbcDirection.Withdrawal:
        return remoteChainAddressInput;
    }
  })();

  const isAmountInputDisabled =
    direction === IbcDirection.Deposit && remoteChainBalance === null;

  return (
    <>
      <Dialog open={isShowing} onClose={close}>
        <DialogTitle>
          IBC Transfer {titlePreposition[direction]}{' '}
          {ibcAsset?.chainInfo.chainName}
        </DialogTitle>
        <DialogContent>
          {sender}
          <div style={{ height: '68px' }}>
            <TextField
              error={!isAmountInputDisabled && isAmountInvalid}
              margin="dense"
              autoFocus={direction === IbcDirection.Withdrawal}
              label="Send amount"
              fullWidth
              variant="standard"
              value={amount}
              helperText={
                !isAmountInputDisabled && isAmountInvalid
                  ? amount
                    ? 'Invalid Amount'
                    : 'Enter Amount'
                  : ''
              }
              onChange={handleAmountChange}
              disabled={isAmountInputDisabled}
              InputProps={{
                type: 'text',
                autoComplete: 'off',
                endAdornment: (
                  <InputAdornment position="end">
                    <PetnameSpan name={purse?.brandPetname} />
                  </InputAdornment>
                ),
              }}
            />
          </div>
          <Box sx={{ marginY: 1, display: 'flex', justifyContent: 'center' }}>
            <ArrowDownward />
          </Box>
          {recipient}
          <Typography color="primary">{error}</Typography>
        </DialogContent>
        <DialogActions>
          {inProgress ? (
            <CircularProgress size={36} sx={{ p: 1, mx: 1 }} />
          ) : (
            <>
              {/* @ts-expect-error 'cancel' is part of our theme */}
              <Button color="cancel" onClick={close}>
                Cancel
              </Button>
              <Button
                onClick={send}
                disabled={isAmountInvalid || !isRemoteChainAddressValid}
              >
                {actionName[direction]}{' '}
                {typeof purse?.brandPetname === 'string' && purse.brandPetname}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <Snackbar
        open={isSnackbarOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        action={
          <React.Fragment>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleCloseSnackbar}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </React.Fragment>
        }
      />
    </>
  );
};

export default withApplicationContext(IbcTransferInternal, context => ({
  keplrConnection: context.keplrConnection,
}));
