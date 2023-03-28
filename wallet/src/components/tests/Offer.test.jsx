import { act } from '@testing-library/react';
import { stringifyPurseValue } from '@agoric/ui-components';
import { mount } from 'enzyme';
import Chip from '@mui/material/Chip';
import Offer from '../Offer';
import Request from '../Request';
import { formatDateNow } from '../../util/Date';
import Popover from '@mui/material/Popover';

jest.mock('@endo/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => Promise.resolve(method.apply(this, args));
      },
    }),
}));

jest.mock('@agoric/ui-components', () => ({
  stringifyPurseValue: ({ value, displayInfo }) =>
    `${value} ${displayInfo?.assetKind} ${displayInfo?.decimalPlaces}`,
}));

jest.mock(
  '../PurseValue',
  () =>
    ({ value, displayInfo, brandPetname }) =>
      `${value} ${displayInfo?.assetKind} ${displayInfo?.decimalPlaces} ${brandPetname}`,
);

jest.mock('../../util/Date', () => ({ formatDateNow: stamp => String(stamp) }));
jest.mock('@mui/material/Popover', () => ({ children }) => <>{children}</>);
const pendingOffers = new Set();
const setPendingOffers = jest.fn();
const declinedOffers = new Set();
const setDeclinedOffers = jest.fn();
const setClosedOffers = jest.fn();
const purses = [];
const swingsetParams = {
  beansPerUnit: [
    { key: 'feeUnit', beans: '1000000000000' },
    { key: 'minFeeDebit', beans: '200000000000' },
    { key: 'message', beans: '1000000000' },
    { key: 'messageByte', beans: '20000000' },
    { key: 'inboundTx', beans: '10000000000' },
  ],
};

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <Component
        pendingOffers={pendingOffers}
        setPendingOffers={setPendingOffers}
        declinedOffers={declinedOffers}
        setDeclinedOffers={setDeclinedOffers}
        setClosedOffers={setClosedOffers}
        purses={purses}
        swingsetParams={swingsetParams}
        {...props}
      />
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

const offer = {
  status: 'proposed',
  id: '123',
  offerId: 'https://tokenpalace.app#555',
  sourceDescription: ['TokenPalace', 'Installation'],
  instanceHandleBoardId: '123',
  requestContext: {
    dappOrigin: 'https://tokenpalace.app',
    origin: 'unknown origin',
  },
  proposalForDisplay: {
    arguments: [],
    give: {
      Collateral: {
        amount: {
          brand: { kind: 'brand', petname: 'PAL' },
          displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
          value: 1000000n,
        },
        pursePetname: 'Palace Token',
      },
    },
    want: {
      RUN: {
        amount: {
          brand: { kind: 'brand', petname: 'RUN' },
          displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
          value: 18544198n,
        },
        pursePetname: 'Zoe fees',
      },
    },
  },
  invitationDetails: {
    fee: {
      value: 5000000n,
      brand: { kind: 'brand', petname: 'RUN' },
      displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
    },
    feePursePetname: 'Zoe fees',
    expiry: 1723014088n,
  },
  spendAction: ''.padStart(649, 'x'),
  isSeated: false,
};

test('renders the gives', () => {
  const component = mount(<Offer offer={offer} />);

  const give = component.find('.OfferEntry').at(0);

  expect(give.text()).toContain('Give Collateral');
  expect(give.text()).toContain(
    stringifyPurseValue({
      value: offer.proposalForDisplay.give.Collateral.amount.value,
      displayInfo: offer.proposalForDisplay.give.Collateral.amount.displayInfo,
    }),
  );
  expect(give.text()).toContain('from Palace Token');
});

test('renders the wants', () => {
  const component = mount(<Offer offer={offer} />);

  const want = component.find('.OfferEntry').at(1);

  expect(want.text()).toContain('Want RUN');
  expect(want.text()).toContain(
    stringifyPurseValue({
      value: offer.proposalForDisplay.want.RUN.amount.value,
      displayInfo: offer.proposalForDisplay.want.RUN.amount.displayInfo,
    }),
  );
  expect(want.text()).toContain('into Zoe fees');
});

test('renders the fee', () => {
  const component = mount(<Offer offer={offer} />);

  const fee = component.find('.OfferEntry').at(2);

  expect(fee.text()).toContain('Pay Fee');
  expect(fee.text()).toContain(
    stringifyPurseValue({
      value: offer.invitationDetails.fee.value,
      displayInfo: offer.invitationDetails.fee.displayInfo,
    }),
  );
  expect(fee.text()).toContain('from Zoe fees');
});

test('renders the expiry', () => {
  const component = mount(<Offer offer={offer} />);

  const expiry = component.find('.OfferEntry').at(3);

  expect(expiry.text()).toContain('Expiry');
  expect(expiry.text()).toContain(
    formatDateNow(offer.invitationDetails.expiry),
  );
});

test('renders the arguments', () => {
  const component = mount(<Offer offer={offer} />);

  const args = component.find('.OfferEntry').at(4);

  expect(args.text()).toContain('Arguments');
  expect(args.text()).toContain(
    JSON.stringify(offer.proposalForDisplay.arguments, null, 2),
  );
});

test('renders the controls', () => {
  const component = mount(<Offer offer={offer} />);

  const controls = component.find('.Controls');

  expect(controls.find(Chip).at(0).text()).toContain('Approve');
  expect(controls.find(Chip).at(1).text()).toContain('Decline');
});

test('renders the exit button while seated', () => {
  const pendingOffer = { ...offer, isSeated: true };
  pendingOffer.status = 'pending';

  const component = mount(<Offer offer={pendingOffer} />);

  expect(component.find(Chip).at(0).text()).toContain('Pending');
  expect(component.find('.Controls').find(Chip).text()).toContain('Exit');
});

test('renders the pending state eagerly', () => {
  const component = mount(
    <Offer offer={offer} pendingOffers={new Set([offer.id])} />,
  );

  expect(component.find(Chip).at(0).text()).toContain('Pending');
});

test('renders the declined state eagerly', () => {
  const component = mount(
    <Offer offer={offer} declinedOffers={new Set([offer.id])} />,
  );

  expect(component.find(Chip).at(0).text()).toContain('Declined');
  expect(component.find('.Controls').find(Chip)).toHaveLength(0);
});

test('renders the accepted state', () => {
  const acceptedOffer = { ...offer };
  acceptedOffer.status = 'accept';

  const component = mount(<Offer offer={acceptedOffer} />);

  expect(component.find(Chip).at(0).text()).toContain('Accepted');
  expect(component.find('.Controls').find(Chip)).toHaveLength(0);
});

test('renders the declined state', () => {
  const declinedOffer = { ...offer };
  declinedOffer.status = 'decline';

  const component = mount(<Offer offer={declinedOffer} />);

  expect(component.find(Chip).at(0).text()).toContain('Declined');
  expect(component.find('.Controls').find(Chip)).toHaveLength(0);
});

test('renders the request as completed when appropriate', () => {
  let component = mount(<Offer offer={offer} />);
  expect(component.find(Request).props().completed).toEqual(false);

  const declinedOffer = { ...offer };
  declinedOffer.status = 'decline';
  component = mount(<Offer offer={declinedOffer} />);
  expect(component.find(Request).props().completed).toEqual(true);

  const acceptedOffer = { ...offer };
  acceptedOffer.status = 'accept';
  component = mount(<Offer offer={acceptedOffer} />);
  expect(component.find(Request).props().completed).toEqual(true);

  const completedOffer = { ...offer };
  completedOffer.status = 'complete';
  component = mount(<Offer offer={completedOffer} />);
  expect(component.find(Request).props().completed).toEqual(true);

  const pendingOffer = { ...offer };
  pendingOffer.status = 'pending';
  component = mount(<Offer offer={pendingOffer} />);
  expect(component.find(Request).props().completed).toEqual(false);

  const rejectedOffer = { ...offer };
  rejectedOffer.status = 'rejected';
  component = mount(<Offer offer={rejectedOffer} />);
  expect(component.find(Request).props().completed).toEqual(true);
  rejectedOffer.isSeated = true;
  component = mount(<Offer offer={rejectedOffer} />);
  expect(component.find(Request).props().completed).toEqual(false);

  const cancelledOffer = { ...offer };
  cancelledOffer.status = 'cancel';
  component = mount(<Offer offer={cancelledOffer} />);
  expect(component.find(Request).props().completed).toEqual(true);

  const refundedOffer = { ...offer };
  refundedOffer.status = 'refunded';
  component = mount(<Offer offer={refundedOffer} />);
  expect(component.find(Request).props().completed).toEqual(true);
});

test('closes the offer', () => {
  const component = mount(<Offer offer={offer} />);

  act(() => component.find(Request).props().close());

  expect(setClosedOffers).toHaveBeenCalledWith({
    offerId: offer.id,
    isClosed: true,
  });
  expect(setPendingOffers).toHaveBeenCalledWith({
    offerId: offer.id,
    isPending: false,
  });
  expect(setDeclinedOffers).toHaveBeenCalledWith({
    offerId: offer.id,
    isDeclined: false,
  });
});

test('accepts the offer', async () => {
  const accept = jest.fn();
  offer.actions = {
    accept: async () => accept(),
  };
  const component = mount(<Offer offer={offer} />);

  await act(async () => component.find(Chip).at(1).props().onClick());

  expect(setPendingOffers).toHaveBeenCalledWith({
    offerId: offer.id,
    isPending: true,
  });
  expect(accept).toHaveBeenCalledWith();
});

test('declines the offer', () => {
  const decline = jest.fn();
  offer.actions = {
    decline: async () => decline(),
  };
  const component = mount(<Offer offer={offer} />);

  act(() => component.find(Chip).at(2).props().onClick());

  expect(setDeclinedOffers).toHaveBeenCalledWith({
    offerId: offer.id,
    isDeclined: true,
  });
  expect(decline).toHaveBeenCalledWith();
});

test('cancels the offer', () => {
  const tryExit = jest.fn(() => Promise.resolve());
  const pendingOffer = {
    ...offer,
    isSeated: true,
    status: 'pending',
    actions: { tryExit },
  };
  const component = mount(<Offer offer={pendingOffer} />);

  act(() => component.find(Chip).at(1).props().onClick());

  expect(tryExit).toHaveBeenCalledWith();
});

test('renders the dapp origin', () => {
  const component = mount(<Offer offer={offer} />);

  expect(component.find('.OfferOrigin').text()).toContain(
    'TokenPalace.Installation via https://tokenpalace.app',
  );
});

test('renders the execution fee', async () => {
  const component = mount(<Offer offer={offer} />);
  const feeInfo = component.find('.execution-fee-info').at(0);

  expect(feeInfo.text()).toContain('Execution Fee: 0.02398 IST');
});

test('renders the execution fee with a different spendAction', async () => {
  const component = mount(
    <Offer offer={{ ...offer, spendAction: ''.padStart(651, 'x') }} />,
  );
  const feeInfo = component.find('.execution-fee-info').at(0);

  expect(feeInfo.text()).toContain('Execution Fee: 0.02402 IST');
});

test('renders the fees accumulated with beansOwing null', async () => {
  const component = mount(<Offer offer={offer} beansOwing={null} />);
  const popover = component.find(Popover);

  expect(popover.text()).toContain('Current Fees Accumulated: 0 / 0.2 IST');
});

test('renders the fees accumulated with beansOwing < minFeeDebit', () => {
  const component = mount(<Offer offer={offer} beansOwing={110000000000} />);
  const popover = component.find(Popover);

  expect(popover.text()).toContain('Current Fees Accumulated: 0.11 / 0.2 IST');
});

test('renders the fees accumulated with beansOwing > minFeeDebit', () => {
  const component = mount(<Offer offer={offer} beansOwing={320000000000} />);
  const popover = component.find(Popover);

  expect(popover.text()).toContain('Current Fees Accumulated: 0.12 / 0.2 IST');
});
