// @ts-check
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import * as React from 'react';
import { useState, useMemo } from 'react';

import { AmountMath } from '@agoric/ertp';
import { withApplicationContext } from '../contexts/Application';

const steps = {
  INITIAL: 0,
  AWAITING_APPROVAL: 1,
  IN_PROGRESS: 2,
};

const errors = {
  NO_SIGNER: 'Cannot sign a transaction in read only mode, connect to keplr.',
};

const convertUBldToBld = ubld => ubld / 1000000;

// 100 IST
const MINIMUM_PROVISION_POOL_BALANCE = 100n * 1_000_000n;

const isProvisionPoolLow = provisionPoolData =>
  provisionPoolData &&
  AmountMath.subtract(
    provisionPoolData.totalMintedConverted,
    provisionPoolData.totalMintedProvided,
  ).value < MINIMUM_PROVISION_POOL_BALANCE;

const ProvisionDialog = ({
  onClose,
  open,
  address,
  href,
  keplrConnection,
  provisionPoolData,
  creationFee,
}) => {
  const [currentStep, setCurrentStep] = useState(steps.INITIAL);
  const [error, setError] = useState(/** @type {string?} */ (null));

  const provisionWallet = async signer => {
    setError(null);
    setCurrentStep(steps.AWAITING_APPROVAL);
    try {
      await signer.submitProvision();
    } catch (e) {
      setCurrentStep(steps.INITIAL);
      // @ts-expect-error e unknown
      setError(e.message);
      return;
    }
    setCurrentStep(steps.IN_PROGRESS);
  };

  const handleCreateButtonClicked = () => {
    const {
      signers: { interactiveSigner },
    } = keplrConnection;
    if (!interactiveSigner) {
      setError(errors.NO_SIGNER);
      return;
    }

    return provisionWallet(interactiveSigner);
  };

  const creationFeeForDisplay =
    creationFee && `${convertUBldToBld(creationFee)} BLD`;

  const progressIndicator = text => (
    <Box>
      <Box
        sx={{
          margin: 'auto',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
      <DialogContentText sx={{ pt: 2 }}>{text}</DialogContentText>
    </Box>
  );

  const content = useMemo(() => {
    switch (currentStep) {
      case steps.INITIAL:
        return creationFeeForDisplay && provisionPoolData ? (
          <div>
            <DialogContentText>
              <b>Network Config</b>:{' '}
              <Link href={href} underline="none" color="rgb(0, 176, 255)">
                {href}
              </Link>
            </DialogContentText>
            <DialogContentText sx={{ pt: 2 }}>
              <b>Wallet Address:</b> {address}
            </DialogContentText>
            <DialogContentText sx={{ pt: 2 }}>
              There is no smart wallet provisioned for this address yet. A fee
              of <b>{creationFeeForDisplay}</b> is required to create one.
            </DialogContentText>
          </div>
        ) : (
          progressIndicator('Fetching current creation fee from chain.')
        );
      case steps.AWAITING_APPROVAL:
        return progressIndicator('Please approve the transaction in Keplr.');
      case steps.IN_PROGRESS:
        return progressIndicator('Awaiting smart wallet creation...');
      default:
        return <></>;
    }
  }, [currentStep, href, address, creationFeeForDisplay, provisionPoolData]);

  const provisionPoolLow =
    provisionPoolData !== null && isProvisionPoolLow(provisionPoolData);

  return (
    <Dialog open={open}>
      <DialogTitle>
        {currentStep === steps.INITIAL ? 'Create a' : 'Creating'} Smart Wallet
      </DialogTitle>
      <DialogContent>
        {content}
        {provisionPoolLow && (
          <DialogContentText sx={{ pt: 2 }} color="error">
            The pool of funds to provision smart wallets is too small at this
            time.
          </DialogContentText>
        )}
        {error && (
          <DialogContentText sx={{ pt: 2 }} color="error">
            {error}
          </DialogContentText>
        )}
      </DialogContent>
      {currentStep === steps.INITIAL && (
        <DialogActions>
          <Button color="inherit" onClick={onClose}>
            Change Connection
          </Button>
          <Button
            disabled={!provisionPoolData || !creationFee || provisionPoolLow}
            onClick={handleCreateButtonClicked}
          >
            Create
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default withApplicationContext(ProvisionDialog, context => ({
  keplrConnection: context.keplrConnection,
}));
