import {
  maybeLoad,
  maybeSave,
  watchKey,
  DAPPS_STORAGE_KEY,
} from '../util/storage.js';

export type SmartWalletKey = { chainId: string; address: string };

export type DappKey = { origin: string; smartWalletKey: SmartWalletKey };

export type Dapp = { origin: string; isEnabled?: boolean; petname: string };

export const loadDapps = ({ chainId, address }: SmartWalletKey): Dapp[] =>
  maybeLoad([DAPPS_STORAGE_KEY, chainId, address]) ?? [];

export const loadDapp = ({ smartWalletKey, origin }: DappKey) =>
  loadDapps(smartWalletKey).find(d => d.origin === origin);

export const upsertDapp = (
  { chainId, address }: SmartWalletKey,
  dapp: Dapp,
) => {
  const { origin, isEnabled, petname } = dapp;

  const dapps = loadDapps({ chainId, address });
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    [...dapps.filter(d => d.origin !== origin), { origin, isEnabled, petname }],
  );
};

export const removeDapp = ({
  smartWalletKey: { chainId, address },
  origin,
}: DappKey) => {
  const dapps = loadDapps({ chainId, address });
  maybeSave(
    [DAPPS_STORAGE_KEY, chainId, address],
    dapps.filter(d => d.origin !== origin),
  );
};

export const watchDapps = (
  { chainId, address }: SmartWalletKey,
  onChange: (newDapps: Dapp[]) => void,
) => {
  watchKey([DAPPS_STORAGE_KEY, chainId, address], (newDapps: Dapp[]) =>
    onChange(newDapps ?? []),
  );
};
