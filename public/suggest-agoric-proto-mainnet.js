/* eslint-disable no-alert */
/* global alert, window, fetch */

export async function suggestChain(network, chainName) {
  // alert('networkConfig ' + networkConfig.value);
  const nc = `https://${network}.agoric.net/network-config`;
  const res = await fetch(nc);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }
  const { chainName: chainId } = await res.json();

  const rpc = `https://${network}.rpc.agoric.net`;
  const api = `https://${network}.api.agoric.net`;

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
    chainName,
    stakeCurrency,
    walletUrlForStaking: `https://${network}.staking.agoric.app`,
    bip44: {
      coinType: 564,
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
    features: ['stargate', 'ibc-transfer'],
  };
  await window.keplr.experimentalSuggestChain(chainInfo);
  await window.keplr.enable(chainId);
}

window.addEventListener('load', async _ => {
  try {
    if (!window.keplr) {
      throw Error('keplr not found');
    }
    await suggestChain('main', 'Agoric Proto-mainnet');
    alert(`Agoric network installed!`);
  } catch (e) {
    console.log(e);
    alert(`Failed Agoric network: ${e}`);
  }
});
