export const KnownNetworkConfigUrls = {
  main: 'https://main.agoric.net/network-config',
  devnet: 'https://devnet.agoric.net/network-config',
  testnet: 'https://emerynet.agoric.net/network-config',
  local: `${window.location.origin}/wallet/network-config`,
};

export const DEFAULT_CONNECTION_CONFIGS = Object.values(
  KnownNetworkConfigUrls,
).map(href => ({ href }));

export const networkConfigUrl = {
  fromSource(source) {
    return KnownNetworkConfigUrls[source];
  },
  toSource(href) {
    const matchingEntry = Object.entries(KnownNetworkConfigUrls).find(
      ([_, url]) => url === href,
    );
    if (matchingEntry) {
      return matchingEntry[0] as keyof typeof KnownNetworkConfigUrls;
    }
    return 'custom';
  },
};

export type NetworkConfigSource = ReturnType<typeof networkConfigUrl.toSource>;

export type ConnectionConfig = {
  href: string;
  api?: string;
  rpc?: string;
  accessToken?: string;
};
