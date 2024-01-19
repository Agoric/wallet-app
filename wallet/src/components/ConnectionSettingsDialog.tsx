import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';
import { useMemo, useState, useEffect } from 'react';
import { withApplicationContext } from '../contexts/Application';
import {
  ConnectionConfig,
  NetworkConfigSource,
  networkConfigUrl,
} from '../util/connections';
import isEqual from 'lodash-es/isEqual';
import { maybeSave } from '../util/storage';

const useStyles = makeStyles(_ => ({
  centeredText: {
    textAlign: 'center',
  },
}));

const Errors = {
  INVALID_URL: 'invalid url',
  INVALID_ACCESS_TOKEN: 'invalid access token',
  INVALID_ADDRESS: 'invalid address',
};

const ErrorLabel = ({ children }) => {
  return (
    <Box
      sx={theme => ({
        color: theme.palette.error.main,
        fontSize: '14px',
        paddingLeft: '4px',
        height: '16px',
        ml: 1,
        mt: 0.5,
      })}
    >
      {children}
    </Box>
  );
};

const useNodeSuggestions = (networkConfigHref: string) => {
  const [apiSuggestions, setApiSuggestions] = useState<string[]>([]);
  const [rpcSuggestions, setRpcSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let didConfigChange = false;
    setRpcSuggestions([]);
    setApiSuggestions([]);

    const updateSuggestions = async () => {
      const url = new URL(networkConfigHref);
      const res = await fetch(url);
      if (!res.ok) {
        throw Error(`Cannot fetch network: ${res.status}`);
      }
      const networkConfig = await res.json();

      if (didConfigChange) return;
      setApiSuggestions(networkConfig.apiAddrs ?? []);
      setRpcSuggestions(networkConfig.rpcAddrs ?? []);
    };

    updateSuggestions().catch(() =>
      console.error(
        'error fetching node suggestions from config',
        networkConfigHref,
      ),
    );

    return () => {
      didConfigChange = true;
    };
  }, [networkConfigHref]);

  return { apiSuggestions, rpcSuggestions };
};

const ConnectionSettingsDialog = ({
  onClose,
  open,
  disconnect,
  connectionConfig,
  setConnectionConfig,
  allConnectionConfigs,
  setAllConnectionConfigs,
  tryKeplrConnect,
}) => {
  const classes = useStyles();
  const smartConnectionHrefs: string[] = allConnectionConfigs.map(c => c.href);

  const [configSource, setConfigSource] = useState<NetworkConfigSource>(
    networkConfigUrl.toSource(connectionConfig.href),
  );

  const [config, setConfig] = useState<ConnectionConfig>(
    connectionConfig || {
      href: networkConfigUrl.fromSource(configSource),
      rpc: undefined,
      api: undefined,
    },
  );

  const { apiSuggestions, rpcSuggestions } = useNodeSuggestions(config.href);

  const errors = new Set();

  try {
    // eslint-disable-next-line no-unused-vars
    const url = new URL(config.href);
  } catch (e) {
    errors.add(Errors.INVALID_URL);
  }

  const hasChanges = useMemo(
    () => !isEqual(config, connectionConfig),
    [config, connectionConfig],
  );

  const saveAndClose = () => {
    if (!hasChanges) {
      // Allow the user to force another retry to connect to Keplr without
      // reloading the page.
      tryKeplrConnect();
      onClose();
      return;
    }

    if (config) {
      if (config.accessToken) {
        maybeSave('accessToken', config.accessToken);
      }
      setConnectionConfig(config);
      disconnect(true);
      const { href, rpc, api } = config;
      const isKnown = allConnectionConfigs.some(c => c.href === href);
      if (!isKnown) {
        setAllConnectionConfigs(conns => [{ href, rpc, api }, ...conns]);
      }
    }
    onClose();
  };

  const smartWalletConfigForm = (
    <>
      <FormControl fullWidth sx={{ width: 360, mt: 2 }}>
        <InputLabel id="demo-simple-select-label">Network name</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={configSource}
          label="Network name"
          onChange={e => {
            const { value } = e.target;
            setConfigSource(value as NetworkConfigSource);
            switch (value) {
              case 'main':
              case 'testnet':
              case 'devnet':
                setConfig({
                  ...config,
                  href: networkConfigUrl.fromSource(value),
                });
                break;
              case 'local':
                setConfig({
                  ...config,
                  href: `${window.location.origin}/wallet/network-config`,
                });
                break;
              case 'custom':
              default:
              // do nothing
            }
          }}
        >
          <MenuItem value="main">Mainnet</MenuItem>
          <MenuItem value="testnet">Testnet</MenuItem>
          <MenuItem value="devnet">Devnet</MenuItem>
          <MenuItem value="local">Local</MenuItem>
          <MenuItem value="custom">
            <i>Custom URL</i>
          </MenuItem>
        </Select>
      </FormControl>
      <Autocomplete
        value={config.href}
        id="connection"
        disabled={configSource !== 'custom'}
        options={smartConnectionHrefs}
        sx={{ width: 360, mt: 2 }}
        onChange={(_, newValue) =>
          newValue &&
          setConfig({
            ...config,
            href: newValue,
          })
        }
        renderOption={(props, option) => <li {...props}>{option}</li>}
        freeSolo
        selectOnFocus
        handleHomeEndKeys
        renderInput={params => (
          <TextField
            {...params}
            label="Network URL"
            onChange={ev =>
              ev.target.value !== config.href &&
              setConfig({
                ...config,
                href: ev.target.value,
              })
            }
          />
        )}
      />
      <Autocomplete
        value={config.rpc}
        id="rpc"
        options={rpcSuggestions}
        sx={{ width: 360, mt: 2 }}
        onChange={(_, newValue) =>
          setConfig({
            ...config,
            rpc: newValue ?? undefined,
          })
        }
        renderOption={(props, option) => <li {...props}>{option}</li>}
        freeSolo
        selectOnFocus
        handleHomeEndKeys
        renderInput={params => (
          <TextField
            {...params}
            label="RPC Node (Default)"
            onChange={ev =>
              ev.target.value !== config.rpc &&
              setConfig({
                ...config,
                rpc: ev.target.value,
              })
            }
          />
        )}
      />
      <Autocomplete
        value={config.api}
        id="api"
        options={apiSuggestions}
        sx={{ width: 360, mt: 2 }}
        onChange={(_, newValue) =>
          setConfig({
            ...config,
            api: newValue ?? undefined,
          })
        }
        renderOption={(props, option) => <li {...props}>{option}</li>}
        freeSolo
        selectOnFocus
        handleHomeEndKeys
        renderInput={params => (
          <TextField
            {...params}
            label="API Node (Default)"
            onChange={ev =>
              ev.target.value !== config.api &&
              setConfig({
                ...config,
                api: ev.target.value,
              })
            }
          />
        )}
      />
      <ErrorLabel>
        {errors.has(Errors.INVALID_URL) ? 'Enter a valid URL' : ''}
      </ErrorLabel>
    </>
  );

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogTitle className={classes.centeredText}>
        Connection Settings
      </DialogTitle>
      <DialogContent>{smartWalletConfigForm}</DialogContent>
      <DialogActions>
        {/* @ts-expect-error 'cancel' is part of our theme */}
        <Button color="cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={saveAndClose} disabled={errors.size > 0}>
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default withApplicationContext(ConnectionSettingsDialog, context => ({
  disconnect: context.disconnect,
  connectionConfig: context.connectionConfig,
  setConnectionConfig: context.setConnectionConfig,
  allConnectionConfigs: context.allConnectionConfigs,
  setAllConnectionConfigs: context.setAllConnectionConfigs,
  tryKeplrConnect: context.tryKeplrConnect,
}));
