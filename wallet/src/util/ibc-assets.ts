type ChainInfo = {
  chainName: string;
  chainId: string;
  rpc: string;
  addressPrefix: string;
  explorerPath: string;
  gas: string;
};

export type AssetInfo = {
  sourcePort: string;
  sourceChannel: string;
  denom: string;
};

export type IbcAsset = {
  chainInfo: ChainInfo;
  deposit: AssetInfo;
  withdraw: AssetInfo;
};

type IbcAssets = Record<string, IbcAsset>;

export const ibcAssets: IbcAssets = {
  ATOM: {
    chainInfo: {
      chainName: 'Cosmos Hub',
      chainId: 'cosmoshub-4',
      rpc: 'https://cosmoshub-rpc.stakely.io/',
      addressPrefix: 'cosmos',
      explorerPath: 'cosmos',
      gas: '100000',
    },
    deposit: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-405',
      denom: 'uatom',
    },
    withdraw: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-5',
      // XXX This will be redundant once `agoricNames.vbankAssets` is published.
      denom:
        'ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA',
    },
  },
};
