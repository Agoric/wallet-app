// @ts-check
/* eslint-disable @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
/// <reference types="ses"/>
import '@endo/eventual-send/shim';

// Ambient types. Needed only for dev but this does a runtime import.
import '@agoric/ertp/exported';
import '@agoric/notifier/exported.js';
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive
import '@agoric/store/exported';
// eslint-disable-next-line import/no-extraneous-dependencies -- transitive
import '@agoric/zoe/exported';
import '@endo/captp/src/types';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  CssBaseline,
  createTheme,
  ThemeProvider,
  StyledEngineProvider,
} from '@mui/material';
import App from './App';
import ApplicationContextProvider from './contexts/Provider';

Error.stackTraceLimit = Infinity;

const appTheme = createTheme({
  palette: {
    primary: {
      main: '#cb2328',
    },
    secondary: {
      main: 'hsla(0,0%,39.2%,.2)',
    },
    success: {
      main: 'rgb(76, 175, 80)',
    },
    // @ts-expect-error unknown property
    cancel: {
      main: '#595959',
    },
    warning: {
      main: 'rgb(255, 152, 0)',
    },
    font: {
      main: '#282230',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    fontWeightRegular: 400,
    h1: {
      fontFamily: ['Montserrat', 'Arial', 'sans-serif'].join(','),
      fontSize: '32px',
      fontWeight: '700',
      letterSpacing: '-1.5px',
      lineHeight: '48px',
      margin: 0,
    },
  },
  appBarHeight: '64px',
  navMenuWidth: '240px',
});

ReactDOM.render(
  <ApplicationContextProvider>
    {/* @ts-ignore bad type */}
    <Router basename="/wallet">
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={appTheme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  </ApplicationContextProvider>,
  document.getElementById('root'),
);
