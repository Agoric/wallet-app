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
  stOSMO: {
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
      denom: 'stuosmo',
    },
    withdraw: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-59',
      denom:
        'ibc/DDAB71B9D194CBF3B87DD6924B3B4846F14061289FCBA8A3989B6F8230BC0F05',
    },
  },
  stTIA: {
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
      denom: 'stutia',
    },
    withdraw: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-59',
      denom:
        'ibc/4BFBA0996893D2049913D24060BE5936EF8AAF2C89E08B91BCCCA2B8DE3BA241',
    },
  },
  stkATOM: {
    chainInfo: {
      chainName: 'Persistence',
      chainId: 'core-1',
      rpc: 'https://persistence-rpc.polkachu.com',
      addressPrefix: 'persistence',
      explorerPath: 'persistence',
      gas: '100000',
    },
    deposit: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-202',
      denom: 'stk/uatom',
    },
    withdraw: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-72',
      denom:
        'ibc/4721B61DBE668E2F3E613E45885396991F21E8374ABDE48CD7336A77B79101A5',
    },
  },
};
