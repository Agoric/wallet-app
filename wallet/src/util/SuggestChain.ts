import type { NetworkConfig } from '@agoric/casting/src/netconfig';
import type { ChainInfo, Keplr } from '@keplr-wallet/types';
import { bech32Config, stableCurrency, stakeCurrency } from './chainInfo';
import { ConnectionConfig } from './connections';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

export const makeChainInfo = (
  networkConfig: NetworkConfig,
  caption: string,
  randomFloat: number,
  walletUrlForStaking?: string,
  config?: ConnectionConfig,
): ChainInfo => {
  const { chainName, rpcAddrs, apiAddrs } = networkConfig;
  const rpcIndex = Math.floor(randomFloat * rpcAddrs.length);

  let rpc: string;
  if (config?.rpc) {
    rpc = config.rpc;
  } else {
    const rpcAddr = rpcAddrs[rpcIndex] ?? '';
    rpc = rpcAddr.match(/:\/\//) ? rpcAddr : `http://${rpcAddr}`;
  }

  let rest: string;
  if (config?.api) {
    rest = config.api;
  } else {
    rest = apiAddrs
      ? // pick the same index as rpc node
        apiAddrs[rpcIndex]
      : // adapt from rpc
        rpc.replace(/(:\d+)?$/, ':1317');
  }

  return {
    rpc,
    rest,
    chainId: chainName,
    chainName: caption,
    stakeCurrency,
    walletUrlForStaking,
    bip44: {
      coinType: AGORIC_COIN_TYPE,
    },
    bech32Config,
    currencies: [stakeCurrency, stableCurrency],
    feeCurrencies: [stableCurrency],
    features: ['stargate', 'ibc-transfer'],
  };
};

export async function suggestChain(
  config: ConnectionConfig,
  {
    fetch,
    keplr,
    random,
  }: {
    fetch: typeof globalThis.fetch;
    keplr: Keplr;
    random: typeof globalThis.Math.random;
  },
  caption?: string,
) {
  console.log('suggestChain: fetch', config.href); // log net IO
  const url = new URL(config.href);
  const res = await fetch(url);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }

  const networkConfig = await res.json();
  // XXX including this breaks the Jest test
  // assertNetworkConfig(harden(networkConfig));

  if (!caption) {
    const subdomain = url.hostname.split('.')[0];
    caption = `Agoric ${subdomain}`;
  }

  const walletUrlForStaking = `https://${url.hostname}.staking.agoric.app`;

  const chainInfo = makeChainInfo(
    networkConfig,
    caption,
    random(),
    walletUrlForStaking,
    config,
  );
  console.log('chainInfo', chainInfo);
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainInfo.chainId);
  console.log('keplr.enable chainId =', chainInfo.chainId, 'done');

  return chainInfo;
}
