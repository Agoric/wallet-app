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
import Petname from './Petname';
import { ibcAssets } from '../util/ibc-assets';
import { stringifyPurseValue } from '@agoric/ui-components';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import { Box } from '@mui/system';
import { fromBech32 } from '@cosmjs/encoding';
import { queryBankBalances } from '../util/queryBankBalances';
import type { PurseInfo } from '../service/Offers';
import type { KeplrUtils } from '../contexts/Provider';
import { SigningStargateClient } from '@cosmjs/stargate';
import { CircularProgress, Link, Snackbar, Typography } from '@mui/material';

export enum IbcDirection {
  Deposit,
  Withdrawal,
}

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

interface Params {
  purse?: PurseInfo;
  direction: IbcDirection;
  handleClose: () => void;
  keplrConnection: KeplrUtils;
}

const secondsUntilTimeout = 300;

const timeoutTimestampSeconds = () =>
  Math.round(Date.now() / 1000) + secondsUntilTimeout;

const agoricChainId = 'agoric-3';
const agoricRpc = 'https://agoric-rpc.stakely.io/';

// Exported for testing only.
export const IbcTransferInternal = ({
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
  const [remoteChainAddress, setRemoteChainAddress] = useState('');
  const [remoteChainBalance, setRemoteChainBalance] = useState<bigint | null>(
    null,
  );
  const [remoteChainSigner, setRemoteChainSigner] = useState(null);

  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const handleCloseSnackbar = _ => {
    setIsSnackbarOpen(false);
  };
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const showSnackbar = msg => {
    setSnackbarMessage(msg);
    setIsSnackbarOpen(true);
  };

  const isRemoteChainAddressInvalid = useMemo(() => {
    if (!remoteChainAddress) return true;

    try {
      const { prefix } = fromBech32(remoteChainAddress);
      return prefix !== ibcAsset?.chainInfo.addressPrefix;
    } catch (e) {
      return true;
    }
  }, [remoteChainAddress, ibcAsset]);

  useEffect(() => {
    setRemoteChainBalance(null);
    if (isRemoteChainAddressInvalid || !ibcAsset) return;

    let isCancelled = false;

    const doQuery = async () => {
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

    void doQuery();

    return () => {
      isCancelled = true;
    };
  }, [remoteChainAddress, isRemoteChainAddressInvalid, ibcAsset]);

  const handleAmountChange = e => {
    setAmount(e.target.value);
  };

  const fillFromKeplr = async () => {
    assert(ibcAsset);
    // @ts-expect-error window keys
    const { keplr } = window;
    const offlineSigner = await keplr.getOfflineSignerOnlyAmino(
      ibcAsset.chainInfo.chainId,
    );
    const accounts = await offlineSigner.getAccounts();
    setRemoteChainAddress(accounts[0].address);
    setRemoteChainSigner(offlineSigner);
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

  const close = () => {
    setAmount('');
    setRemoteChainAddress('');
    setRemoteChainSigner(null);
    setError('');
    handleClose();
  };

  const send = async () => {
    setError('');

    let val;
    try {
      val = String(
        parseAsValue(
          amount,
          purse?.displayInfo?.assetKind,
          purse?.displayInfo?.decimalPlaces,
        ),
      );
    } catch (e) {
      setError(String(e));
    }

    assert(ibcAsset);

    if (direction === IbcDirection.Deposit) {
      assert(remoteChainSigner && keplrConnection);
      const { chainInfo, deposit } = ibcAsset;
      const { sourceChannel, sourcePort, denom, gas } = deposit;
      assert(gas);

      setInProgress(true);
      const signer = await SigningStargateClient.connectWithSigner(
        chainInfo.rpc,
        remoteChainSigner,
      );
      try {
        const res = await signer.sendIbcTokens(
          remoteChainAddress,
          keplrConnection.address,
          {
            amount: val,
            denom: denom,
          },
          sourcePort,
          sourceChannel,
          undefined,
          timeoutTimestampSeconds(),
          {
            amount: [{ amount: '0', denom }],
            gas,
          },
        );
        close();
        showSnackbar(
          <>
            Successfully executed transaction{' '}
            <Link
              color="rgb(0, 176, 255)"
              href={`https://bigdipper.live/${chainInfo.explorerPath}/transactions/${res.transactionHash}`}
              target={res.transactionHash}
            >
              ...{res.transactionHash.slice(res.transactionHash.length - 12)}
            </Link>
          </>,
        );
      } catch (e) {
        setError(String(e));
      } finally {
        setInProgress(false);
      }
    } else {
      /* Is Withdrawal */
      setInProgress(true);
      const {
        withdraw: { denom, sourceChannel, sourcePort },
      } = ibcAsset;

      // @ts-expect-error window keys
      const { keplr } = window;
      const offlineSigner = await keplr.getOfflineSignerOnlyAmino(
        agoricChainId,
      );
      const client = await SigningStargateClient.connectWithSigner(
        agoricRpc,
        offlineSigner,
      );

      try {
        const res = await client.sendIbcTokens(
          keplrConnection.address,
          remoteChainAddress,
          {
            amount: val,
            denom,
          },
          sourcePort,
          sourceChannel,
          undefined,
          timeoutTimestampSeconds(),
          {
            amount: [{ amount: '0', denom: 'uist' }],
            gas: '300000',
          },
        );
        close();
        showSnackbar(
          <>
            Successfully executed transaction{' '}
            <Link
              color="rgb(0, 176, 255)"
              href={`https://bigdipper.live/agoric/transactions/${res.transactionHash}`}
              target={res.transactionHash}
            >
              ...{res.transactionHash.slice(res.transactionHash.length - 12)}
            </Link>
          </>,
        );
      } catch (e) {
        console.log('error', e);
        setError(String(e));
      } finally {
        setInProgress(false);
      }
    }
  };

  const agoricAddressInfo = (
    <TextField
      sx={{ width: 420, marginBottom: 2 }}
      margin="dense"
      label={agoricAddressLabel[direction]}
      fullWidth
      variant="standard"
      value={keplrConnection?.address}
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
      sx={{ width: 420 }}
      margin="dense"
      label={remoteChainAddressLabel[direction]}
      fullWidth
      variant="standard"
      value={remoteChainAddress}
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
    <Box sx={{ marginY: 3 }}>
      <Button onClick={() => fillFromKeplr()} variant="contained">
        Connect With Keplr
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
      error={!!isRemoteChainAddressInvalid}
      helperText={
        isRemoteChainAddressInvalid ? (
          'Invalid Address'
        ) : remoteChainBalance !== null ? (
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
      InputProps={{
        type: 'text',
        autoComplete: 'off',
        endAdornment: isRemoteChainAddressInvalid && (
          <InputAdornment position="end">
            <Button size="small" onClick={() => fillFromKeplr()}>
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
      <Dialog open={!!purse} onClose={close}>
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
                  ? 'Invalid amount'
                  : ''
              }
              onChange={handleAmountChange}
              disabled={isAmountInputDisabled}
              InputProps={{
                type: 'text',
                autoComplete: 'off',
                endAdornment: (
                  <InputAdornment position="end">
                    <Petname name={purse?.brandPetname} />
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
                disabled={isAmountInvalid || isRemoteChainAddressInvalid}
              >
                Send
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
      />
    </>
  );
};

export default withApplicationContext(IbcTransferInternal, context => ({
  keplrConnection: context.keplrConnection,
}));
