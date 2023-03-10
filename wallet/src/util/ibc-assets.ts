type ChainInfo = {
  chainName: string;
  chainId: string;
  rpc: string;
  addressPrefix: string;
  explorerPath: string;
};

type AssetInfo = {
  sourcePort: string;
  sourceChannel: string;
  denom: string;
  gas?: string;
};

type IbcAssets = Record<
  string,
  {
    chainInfo: ChainInfo;
    deposit: AssetInfo;
    withdraw: AssetInfo;
  }
>;

export const ibcAssets: IbcAssets = {
  IbcATOM: {
    chainInfo: {
      chainName: 'Cosmos Hub',
      chainId: 'cosmoshub-4',
      rpc: 'https://cosmoshub-rpc.stakely.io/',
      addressPrefix: 'cosmos',
      explorerPath: 'cosmos',
    },
    deposit: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-405',
      denom: 'uatom',
      gas: '100000',
    },
    withdraw: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-5',
      denom:
        'ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA',
    },
  },
};
