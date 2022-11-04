import { useMemo, forwardRef } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';
import { makeStyles, useTheme } from '@mui/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Apps from '@mui/icons-material/Apps';
import People from '@mui/icons-material/People';
import AddCircle from '@mui/icons-material/AddCircle';
import { withApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(theme => ({
  nav: {
    position: 'fixed',
    // @ts-ignore on our theme
    top: theme.appBarHeight,
    // @ts-ignore on our theme
    width: theme.navMenuWidth,
    // @ts-ignore on our theme
    height: `calc(100vh - ${theme.appBarHeight})`,
    overflowY: 'auto',
    // @ts-ignore on our theme
    [theme.breakpoints.down('md')]: {
      position: 'relative',
      top: '0',
    },
  },
  sectionHeader: {
    padding: '16px',
    fontFamily: ['Montserrat', 'Arial', 'sans-serif'].join(','),
    fontWeight: 700,
    letterSpacing: '0.15px',
    fontSize: '16px',
  },
}));

const ListItemLink = ({ icon, primary, to, onClick }) => {
  const match = useRouteMatch({
    path: to,
    exact: true,
  });

  const renderLink = useMemo(
    () =>
      forwardRef((itemProps, ref) => {
        return (
          // @ts-ignore
          <Link
            to={to}
            ref={ref}
            {...itemProps}
            role={undefined}
            onClick={onClick}
          />
        );
      }),
    [to],
  );

  return (
    <li>
      <ListItem
        selected={match !== null}
        // @ts-ignore
        button
        style={{ borderRadius: '0 32px 32px 0' }}
        component={renderLink}
        color="primary"
      >
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
};

const NavMenu = ({ setDrawerOpened, previewEnabled }) => {
  const styles = useStyles(useTheme());
  const onLinkClick = () => {
    if (setDrawerOpened) {
      setDrawerOpened(false);
    }
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.sectionHeader}>Wallet</div>
      <List>
        <ListItemLink
          onClick={onLinkClick}
          to="/"
          primary="Dashboard"
          // @ts-ignore
          icon={<DashboardIcon />}
        />
        <ListItemLink
          onClick={onLinkClick}
          to="/dapps"
          primary="Dapps"
          // @ts-ignore
          icon={<Apps />}
        />
        {previewEnabled && (
          // @ts-ignore
          <ListItemLink
            onClick={onLinkClick}
            to="/contacts"
            primary="Contacts"
            // @ts-ignore
            icon={<People />}
          />
        )}
        {previewEnabled && (
          // @ts-ignore
          <ListItemLink
            onClick={onLinkClick}
            to="/issuers"
            primary="Asset Issuers"
            // @ts-ignore
            icon={<AddCircle />}
          />
        )}
      </List>
    </nav>
  );
};

export default withApplicationContext(NavMenu, context => ({
  previewEnabled: context.previewEnabled,
}));
