/* global window fetch */

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

export async function suggestChain(nc, caption = undefined) {
  // alert('networkConfig ' + networkConfig.value);
  const coinType = Number(
    new URL(nc).searchParams.get('coinType') || AGORIC_COIN_TYPE,
  );
  const res = await fetch(nc);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }
  const { chainName: chainId, rpcAddrs } = await res.json();
  const hostname = new URL(nc).hostname;
  const network = hostname.split('.')[0];
  let rpc;
  let api;
  if (network !== hostname) {
    rpc = `https://${network}.rpc.agoric.net`;
    api = `https://${network}.api.agoric.net`;
  } else {
    rpc = `http://${rpcAddrs[Math.floor(Math.random() * rpcAddrs.length)]}`;
    api = rpc.replace(/(:\d+)?$/, ':1317');
  }
  const stakeCurrency = {
    coinDenom: 'BLD',
    coinMinimalDenom: 'ubld',
    coinDecimals: 6,
    coinGeckoId: undefined,
  };
  const stableCurrency = {
    coinDenom: 'RUN',
    coinMinimalDenom: 'urun',
    coinDecimals: 6,
    coinGeckoId: undefined,
  };
  const chainInfo = {
    rpc,
    rest: api,
    chainId,
    chainName: caption || `Agoric ${network}`,
    stakeCurrency,
    walletUrlForStaking: `https://${network}.staking.agoric.app`,
    bip44: {
      coinType,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'agoric',
      bech32PrefixAccPub: 'agoricpub',
      bech32PrefixValAddr: 'agoricvaloper',
      bech32PrefixValPub: 'agoricvaloperpub',
      bech32PrefixConsAddr: 'agoricvalcons',
      bech32PrefixConsPub: 'agoricvalconspub',
    },
    currencies: [stakeCurrency, stableCurrency],
    feeCurrencies: [stableCurrency],
    gasPriceStep: {
      low: 0.0, // allow 0 RUN
      average: 0.02,
      high: 0.04,
    },
    features: ['stargate', 'ibc-transfer'],
  };
  await window.keplr.experimentalSuggestChain(chainInfo);
  await window.keplr.enable(chainId);
}
