import React from 'react';
import Popover from '@mui/material/Popover';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import { Nat } from '@agoric/nat';
import { stringifyPurseValue } from '@agoric/ui-components';
import Petname from './Petname';
import PurseValue from './PurseValue';
import { formatDateNow } from '../util/Date';
import { withApplicationContext } from '../contexts/Application.jsx';
import BrandIcon from './BrandIcon';

import './Offer.scss';
import { Typography } from '@mui/material';

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
          {type.move} <Petname name={purse.pursePetname} />
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
          {type.move} <Petname name={pursePetname} />
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

const Proposal = ({ offer, purses, swingsetParams, beansOwing }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const isOpen = Boolean(anchorEl);

  const {
    proposalForDisplay,
    proposalTemplate,
    invitationDetails: { fee, feePursePetname, expiry } = {},
    error,
    spendAction,
  } = offer;

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
    beansOwing &&
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
            <Petname name={fee.brand.petname} />
          </div>
          from <Petname name={feePursePetname} />
        </div>
      </div>
    </div>
  );

  const executionFeeEntry = feeThreshold && accumulatedFees && feeDelta && (
    <Box sx={{ mt: 2, fontWeight: '400' }} className="text-gray">
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
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, maxWidth: '480px' }}>
          <Typography>
            Fees pay for on-chain execution costs. They accumulate with each
            transaction and are deducted from your purse balance every{' '}
            {feeThreshold} IST.
          </Typography>
          <Typography sx={{ pt: 1 }} fontWeight={500}>
            Current Fees Accumulated: {accumulatedFees} / {feeThreshold} IST
          </Typography>
        </Box>
      </Popover>
    </Box>
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
      {executionFeeEntry}
      {expiry && (
        <div className="OfferEntry">
          <h6>Expiry</h6>
          <div className="Expiry text-gray">
            {formatDateNow(parseFloat(expiry) * 1000)}
          </div>
        </div>
      )}
      {args !== undefined && (
        <div className="OfferEntry">
          <h6>Arguments</h6>
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </div>
      )}
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
