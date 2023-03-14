import { mount } from 'enzyme';
import { act } from '@testing-library/react';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { createTheme, ThemeProvider } from '@mui/material';
import Purses, { PursesWithoutContext } from '../Purses';
import PurseAmount from '../PurseAmount';
import Transfer from '../Transfer';
import Loading from '../Loading';

jest.mock('../PurseAmount', () => () => 'PurseAmount');

jest.mock('@endo/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

jest.mock('@agoric/ui-components', () => ({
  parseAsValue: str => BigInt(str),
}));

const appTheme = createTheme({
  palette: {
    // @ts-expect-error in our theme
    cancel: {
      main: '#595959',
    },
    font: {
      main: '#282230',
    },
  },
});

const purses = [
  {
    id: 0,
    brandPetname: 'Moola',
    pursePetname: 'Test currency',
    currentAmount: { value: 62000000n },
    displayInfo: {
      assetKind: 'nat',
      decimalPlaces: 6,
    },
  },
  {
    id: 1,
    brandPetname: 'TestNFT',
    pursePetname: 'Non-fungible testing tokens',
    currentAmount: { value: ['Test token 1', 'Test token 2'] },
    displayInfo: {
      assetKind: 'set',
    },
  },
];

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    // Test the preview features
    props.previewEnabled = true;
    return <Component purses={purses} {...props} />;
  };

jest.mock('../../contexts/Application', () => {
  return {
    withApplicationContext,
    ConnectionStatus: {
      Connected: 'connected',
      Connecting: 'connecting',
      Disconnected: 'disconnected',
      Error: 'error',
    },
  };
});

test('renders the purse amounts', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Purses />
    </ThemeProvider>,
  );

  expect(component.find(PurseAmount)).toHaveLength(2);
});

test('renders a loading indicator when purses is null', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <PursesWithoutContext />
    </ThemeProvider>,
  );

  expect(component.find(Loading)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(0);
});
