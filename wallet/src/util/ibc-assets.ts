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
      rpc: 'https://cosmos-rpc.polkachu.com:443',
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
      denom:
        'ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA',
    },
  },
  stATOM: {
    chainInfo: {
      chainName: 'Stride',
      chainId: 'stride-1',
      rpc: 'https://stride-rpc.polkachu.com:443',
      addressPrefix: 'stride',
      explorerPath: 'stride',
      gas: '100000',
    },
    deposit: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-148',
      denom: 'stuatom',
    },
    withdraw: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-59',
      denom:
        'ibc/B1E6288B5A0224565D915D1F66716486F16D8A44BF33A9EC323DD6BA30764C35',
    },
  },
};
