import { Switch, Route } from 'react-router-dom';
import { makeStyles, useTheme } from '@mui/styles';
import AppBar from './components/AppBar';
import NavMenu from './components/NavMenu';
import Contacts from './views/Contacts';
import Dapps from './views/Dapps';
import Dashboard from './views/Dashboard';
import Issuers from './views/Issuers';

import './App.scss';

const useStyles = makeStyles(theme => ({
  main: {
    boxSizing: 'border-box',
    padding: '32px',
    // @ts-expect-error in our theme
    marginLeft: theme.navMenuWidth,
    position: 'absolute',
    // @ts-expect-error in our theme
    width: `calc(100vw - ${theme.navMenuWidth})`,
    // @ts-expect-error in our theme
    top: theme.appBarHeight,
    // @ts-expect-error in our theme
    [theme.breakpoints.down('md')]: {
      marginLeft: '0',
      width: '100vw',
    },
  },
  navMenu: {
    // @ts-expect-error in our theme
    [theme.breakpoints.down('md')]: {
      display: 'none',
    },
  },
}));

const App = () => {
  const classes = useStyles(useTheme());
  return (
    <span className="App">
      <span className={classes.navMenu}>
        <NavMenu />
      </span>
      <main className={classes.main}>
        <Switch>
          <Route path="/dapps">
            <Dapps />
          </Route>
          <Route path="/contacts">
            <Contacts />
          </Route>
          <Route path="/issuers">
            <Issuers />
          </Route>
          <Route path="/">
            <Dashboard />
          </Route>
        </Switch>
      </main>
      <AppBar />
    </span>
  );
};

export default App;
