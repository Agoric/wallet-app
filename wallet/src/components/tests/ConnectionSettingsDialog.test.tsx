import { mount } from 'enzyme';
import ConnectionSettingsDialog from '../ConnectionSettingsDialog';
import {
  DEFAULT_CONNECTION_CONFIGS,
  KnownNetworkConfigUrls,
} from '../../util/connections';
import { Select, TextField, ThemeProvider, createTheme } from '@mui/material';
import { act } from '@testing-library/react';

jest.mock('lodash-es/isEqual', () => () => true);

const appTheme = createTheme({
  palette: {
    // @ts-expect-error not in Palette
    cancel: {
      main: '#595959',
    },
  },
});

const MOCK_LOCALHOST = 'http://foobar:440';

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <ThemeProvider theme={appTheme}>
        <Component {...props} />
      </ThemeProvider>
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

describe('Connection setting dialog', () => {
  const { location } = window;

  beforeAll(() => {
    // @ts-expect-error mocking window.location
    delete window.location;

    // @ts-expect-error mocking window.location
    window.location = { origin: MOCK_LOCALHOST };
  });

  afterAll(() => {
    window.location = location;
  });

  test('displays the dapp', () => {
    const component = mount(
      <ConnectionSettingsDialog
        allConnectionConfigs={DEFAULT_CONNECTION_CONFIGS}
        connectionConfig={{ href: KnownNetworkConfigUrls.main }}
        open
      />,
    );

    const networkSelect = component.find(Select).first();
    act(() => networkSelect.props().onChange({ target: { value: 'local' } }));
    component.update();

    const textField = component.find(TextField).first();
    const inputField = textField.find('input').first();

    expect(inputField.prop('value')).toEqual(
      `${MOCK_LOCALHOST}/wallet/network-config`,
    );
  });
});
