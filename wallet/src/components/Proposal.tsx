import * as React from 'react';
import Popover from '@mui/material/Popover';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import { Nat } from '@agoric/nat';
import { stringifyPurseValue } from '@agoric/ui-components';
import PetnameSpan from './PetnameSpan';
import PurseValue from './PurseValue';
import { formatDateNow } from '../util/Date';
import { withApplicationContext } from '../contexts/Application';
import BrandIcon from './BrandIcon';
import { stringify } from '../util/marshal';
import { Typography } from '@mui/material';

import './Offer.scss';

const OfferEntryFromTemplate = (
  type,
  [role, { value: stringifiedValue, pursePetname }],
  purses,
) => {
  const value = BigInt(stringifiedValue);
  const purse = purses.find(p => p.pursePetname === pursePetname);
  if (!purse) {
    return null;
  }
  return (
    <div className="OfferEntry" key={purse.brandPetname}>
      <h6>
        {type.header} {role}
      </h6>
      <div className="Token">
        <BrandIcon brandPetname={purse.brandPetname} />
        <div>
          <PurseValue
            value={value}
            displayInfo={purse.displayInfo}
            brandPetname={purse.brandPetname}
          />
          {type.move} <PetnameSpan name={purse.pursePetname} />
        </div>
      </div>
    </div>
  );
};

const OfferEntryFromDisplayInfo = (type, [role, { amount, pursePetname }]) => {
  const value =
    amount.displayInfo.assetKind === 'nat' ? Nat(amount.value) : amount.value;
  return (
    <div className="OfferEntry" key={amount.brand.petname}>
      <h6>
        {type.header} {role}
      </h6>
      <div className="Token">
        <BrandIcon brandPetname={amount.brand.petname} />
        <div>
          <PurseValue
            value={value}
            displayInfo={amount.displayInfo}
            brandPetname={amount.brand.petname}
          />
          {type.move} <PetnameSpan name={pursePetname} />
        </div>
      </div>
    </div>
  );
};

const entryTypes = {
  want: { header: 'Want', move: 'into' },
  give: { header: 'Give', move: 'from' },
};

const GiveFromDisplayInfo = entry =>
  OfferEntryFromDisplayInfo(entryTypes.give, entry);
const WantFromDisplayInfo = entry =>
  OfferEntryFromDisplayInfo(entryTypes.want, entry);

const GiveFromTemplate = (entry, purses) =>
  OfferEntryFromTemplate(entryTypes.give, entry, purses);
const WantFromTemplate = (entry, purses) =>
  OfferEntryFromTemplate(entryTypes.want, entry, purses);

const cmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const sortedEntries = entries =>
  Object.entries(entries).sort(([kwa], [kwb]) => cmp(kwa, kwb));

/**
 * Calculates and displays the execution fee according to the logic in
 * https://github.com/Agoric/agoric-sdk/blob/master/golang/cosmos/x/swingset/types/msgs.go.
 */
const ExecutionFeeInfo = ({ swingsetParams, beansOwing, spendAction }) => {
  beansOwing = Number(beansOwing ?? 0);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isOpen = Boolean(anchorEl);

  const feeUnit = swingsetParams?.beansPerUnit?.find(
    ({ key }) => key === 'feeUnit',
  )?.beans;
  const minFeeDebit = swingsetParams?.beansPerUnit?.find(
    ({ key }) => key === 'minFeeDebit',
  )?.beans;
  const messageCost = swingsetParams?.beansPerUnit?.find(
    ({ key }) => key === 'message',
  )?.beans;
  const messageByteCost = swingsetParams?.beansPerUnit?.find(
    ({ key }) => key === 'messageByte',
  )?.beans;
  const inboundTxCost = swingsetParams?.beansPerUnit?.find(
    ({ key }) => key === 'inboundTx',
  )?.beans;
  const feeThreshold =
    feeUnit && minFeeDebit && Number(minFeeDebit) / Number(feeUnit);
  const accumulatedFees =
    feeUnit &&
    minFeeDebit &&
    (beansOwing % Number(minFeeDebit)) / Number(feeUnit);
  const feeDelta =
    messageCost &&
    inboundTxCost &&
    messageByteCost &&
    feeUnit &&
    spendAction &&
    (Number(messageCost) +
      Number(inboundTxCost) +
      Number(messageByteCost) * spendAction.length) /
      Number(feeUnit);

  return feeThreshold && feeDelta ? (
    <Box
      sx={{ mt: 2, fontWeight: '400' }}
      className="text-gray execution-fee-info"
    >
      <Typography
        sx={{
          display: 'inline',
        }}
      >
        Execution Fee:
      </Typography>{' '}
      <Link color="inherit" href="#" onClick={handleClick}>
        {feeDelta} IST
      </Link>
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Box className="execution-fee-popover" sx={{ p: 2, maxWidth: '480px' }}>
          <Typography>
            Fees pay for on-chain execution costs. They accumulate with each
            transaction and are deducted from your purse balance upon reaching
            the minimum fee batch of {feeThreshold} IST.
          </Typography>
          <Typography sx={{ pt: 1 }} fontWeight={500}>
            Current Fees Accumulated: {accumulatedFees} / {feeThreshold} IST
          </Typography>
        </Box>
      </Popover>
    </Box>
  ) : null;
};

const Proposal = ({ offer, purses, swingsetParams, beansOwing }) => {
  const {
    proposalForDisplay,
    proposalTemplate,
    invitationDetails: {
      fee = undefined,
      feePursePetname = undefined,
      expiry = undefined,
    } = {},
    error,
    spendAction,
    offerArgs,
  } = offer;
  let give = {};
  let want = {};
  let args;
  let hasDisplayInfo = false;
  // Proposed offers only have a `proposalTemplate`. Offers from the wallet
  // contract have a `proposalForDisplay`.
  if (proposalForDisplay) {
    give = proposalForDisplay.give ?? {};
    want = proposalForDisplay.want ?? {};
    args = proposalForDisplay.arguments;
    hasDisplayInfo = true;
  } else if (proposalTemplate) {
    give = proposalTemplate.give ?? {};
    want = proposalTemplate.want ?? {};
    args = proposalTemplate.arguments;
  } else {
    // The offer does not have a proposal.
  }

  if (!purses) return <></>;

  const feeEntry = fee && (
    <div className="OfferEntry">
      <h6>Pay Fee</h6>
      <div className="Token">
        {feePursePetname && <BrandIcon brandPetname={fee.brand.petname} />}
        <div>
          <div className="Value">
            {stringifyPurseValue({
              value: fee.value,
              displayInfo: fee.displayInfo,
            })}{' '}
            <PetnameSpan name={fee.brand.petname} />
          </div>
          from <PetnameSpan name={feePursePetname} />
        </div>
      </div>
    </div>
  );

  const Gives = sortedEntries(give).map(g =>
    hasDisplayInfo ? GiveFromDisplayInfo(g) : GiveFromTemplate(g, purses),
  );
  const Wants = sortedEntries(want).map(w =>
    hasDisplayInfo ? WantFromDisplayInfo(w) : WantFromTemplate(w, purses),
  );

  return (
    <>
      {Gives}
      {Wants}
      {feeEntry}
      {expiry && (
        <div className="OfferEntry">
          <h6>Expiry</h6>
          <div className="Expiry text-gray">
            {formatDateNow(parseFloat(expiry) * 1000)}
          </div>
        </div>
      )}
      {offerArgs !== undefined && (
        <div className="OfferEntry">
          <h6>Arguments</h6>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <Box sx={{ fontFamily: '"RobotoMono", monospace' }}>
              {stringify(offerArgs, true)}
            </Box>
          </details>
        </div>
      )}
      <ExecutionFeeInfo
        beansOwing={beansOwing}
        swingsetParams={swingsetParams}
        spendAction={spendAction}
      />
      {error && (
        <div className="OfferEntry">
          <h6>Error</h6>
          <details style={{ whiteSpace: 'pre-wrap' }}>{error}</details>
        </div>
      )}
    </>
  );
};

export default withApplicationContext(
  Proposal,
  ({ purses, swingsetParams, beansOwing }) => ({
    swingsetParams,
    purses,
    beansOwing,
  }),
);
