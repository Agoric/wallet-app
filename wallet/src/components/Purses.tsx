import { useState } from 'react';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Button from '@mui/material/Button';
import IbcTransfer, { IbcDirection } from './IbcTransfer';
import PurseAmount from './PurseAmount';
import { withApplicationContext } from '../contexts/Application';
import CardItem from './CardItem';
import Card from './Card';
import ErrorBoundary from './ErrorBoundary';
import Loading from './Loading';
import { ibcAssets } from '../util/ibc-assets';
import type { PurseInfo } from '../service/Offers';
import type { KeplrUtils } from '../contexts/Provider';

import './Purses.scss';
import { agoricChainId } from '../util/ibcTransfer';

interface TransferPurse {
  purse?: PurseInfo;
  direction?: IbcDirection;
}

interface Props {
  purses: PurseInfo[] | null;
  previewEnabled: boolean;
  keplrConnection: KeplrUtils | null;
}

// Exported for testing only.
export const PursesWithoutContext = ({
  purses,
  previewEnabled,
  keplrConnection,
}: Props) => {
  const [transferPurse, setTransferPurse] = useState<TransferPurse>({});

  const handleClickDeposit = purse => {
    setTransferPurse({ purse, direction: IbcDirection.Deposit });
  };

  const handleClickWithdraw = purse => {
    setTransferPurse({ purse, direction: IbcDirection.Withdrawal });
  };

  const handleClose = () => {
    setTransferPurse({});
  };

  const Purse = purse => {
    const shouldShowIbcTransferButtons =
      (keplrConnection?.chainId === agoricChainId || previewEnabled) &&
      ibcAssets[purse.brandPetname];

    return (
      <CardItem key={purse.id}>
        <div className="Left">
          <ErrorBoundary>
            <PurseAmount
              brandPetname={purse.brandPetname}
              pursePetname={purse.pursePetname}
              value={purse.currentAmount.value}
              displayInfo={purse.displayInfo}
            />
          </ErrorBoundary>
        </div>
        {shouldShowIbcTransferButtons && (
          <div className="Right">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleClickDeposit(purse)}
            >
              <ArrowDownward fontSize="small" />
              Deposit
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleClickWithdraw(purse)}
            >
              <ArrowUpward fontSize="small" />
              Withdraw
            </Button>
          </div>
        )}
      </CardItem>
    );
  };

  const purseItems = (purses && purses.map(Purse)) ?? (
    <Loading defaultMessage="Fetching purses..." />
  );

  const helptip = (
    <span>
      The smart wallet only supports certain assets and IBC denoms. If you are
      missing assets it may be because they are not supported.{' '}
      <a
        target="supported-assets"
        href="https://docs.inter.trade/inter-protocol-system-documentation/parity-stability-module/supported-assets"
      >
        Please see information on supported assets.
      </a>
    </span>
  );

  return (
    <div>
      <Card header="Purses" helptip={helptip}>
        {purseItems}
      </Card>
      <IbcTransfer
        purse={transferPurse.purse}
        direction={transferPurse.direction ?? IbcDirection.Deposit}
        handleClose={handleClose}
      />
    </div>
  );
};

export default withApplicationContext(PursesWithoutContext, context => ({
  purses: context.purses,
  previewEnabled: context.previewEnabled,
}));
