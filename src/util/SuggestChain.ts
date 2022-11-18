import type { NetworkConfig } from '@agoric/casting/src/netconfig.js';
import type { ChainInfo, Keplr } from '@keplr-wallet/types';
import { bech32Config, stableCurrency, stakeCurrency } from './chainInfo.js';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

export const makeChainInfo = (
  networkConfig: NetworkConfig,
  caption: string,
  randomFloat: number,
  walletUrlForStaking?: string,
): ChainInfo => {
  const { chainName, rpcAddrs, apiAddrs } = networkConfig;
  const index = Math.floor(randomFloat * rpcAddrs.length);

  const rpcAddr = rpcAddrs[index];
  const rpc = rpcAddr.match(/:\/\//) ? rpcAddr : `http://${rpcAddr}`;

  const rest = apiAddrs
    ? // pick the same index
      apiAddrs[index]
    : // adapt from rpc
      rpc.replace(/(:\d+)?$/, ':1317');

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
  networkConfigHref: string,
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
  console.log('suggestChain: fetch', networkConfigHref); // log net IO
  const url = new URL(networkConfigHref);
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
  );
  console.log('chainInfo', chainInfo);
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainInfo.chainId);
  console.log('keplr.enable chainId =', chainInfo.chainId, 'done');

  return chainInfo;
}
