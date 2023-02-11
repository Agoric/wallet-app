import { makeNotifierKit } from '@agoric/notifier';
import {
  loadDapp as load,
  loadDapps as loadAll,
  removeDapp as remove,
  upsertDapp as upsert,
  watchDapps as watch,
} from '../store/Dapps';

import type { Dapp, SmartWalletKey } from '../store/Dapps';

type DappActions = {
  enable: () => void;
  disable: () => void;
  setPetname: (petname: string) => void;
};

export type DappWithActions = Dapp & { actions: DappActions };

export const getDappService = (smartWalletKey: SmartWalletKey) => {
  /** FIXME type {NotifierRecord<DappWithActions[]>} */
  const { notifier, updater } = makeNotifierKit();

  const broadcastUpdates = (dapps: Map<string, DappWithActions>) =>
    updater.updateState([...dapps.values()]);

  const upsertDapp = (dapp: Dapp) => upsert(smartWalletKey, dapp);

  const deleteDapp = (origin: string, updateDapps: () => void) => {
    remove({ smartWalletKey, origin });
    updateDapps();
  };

  const setDappPetname = (
    origin: string,
    petname: string,
    updateDapps: { (): void; (): void },
  ) => {
    const dapp = load({ smartWalletKey, origin });
    assert(dapp, `Tried to set petname on undefined dapp ${origin}`);
    upsertDapp({ ...dapp, petname });
    updateDapps();
  };

  const enableDapp = (origin: string, updateDapps: () => void) => {
    const dapp = load({ smartWalletKey, origin });
    assert(dapp, `Tried to enable undefined dapp ${origin}`);
    upsertDapp({ ...dapp, isEnabled: true });
    updateDapps();
  };

  const updateDapps = () => {
    const dapps = new Map();
    const storedDapps = loadAll(smartWalletKey);
    storedDapps.forEach((d: { origin: string }) => {
      dapps.set(d.origin, {
        ...d,
        actions: {
          enable: () => enableDapp(d.origin, updateDapps),
          setPetname: petname => setDappPetname(d.origin, petname, updateDapps),
          delete: () => deleteDapp(d.origin, updateDapps),
        },
      });
    });
    broadcastUpdates(dapps);
  };

  watch(smartWalletKey, updateDapps);
  updateDapps();

  return {
    notifier,
    addDapp: upsertDapp,
    setDappPetname,
    deleteDapp,
    enableDapp,
  };
};
