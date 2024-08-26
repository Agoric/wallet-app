export const FAUCET_URL_MAP = {
  emerynet: 'https://emerynet.faucet.agoric.net/go',
  devnet: 'https://devnet.faucet.agoric.net/go',
  xnet: 'https://xnet.faucet.agoric.net/go',
  ollinet: 'https://ollinet.faucet.agoric.net/go',
};

export const NETWORKS = {
  emerynet: 'Emerynet',
  devnet: 'Devnet',
  xnet: 'Custom URL',
  ollinet: 'Custom URL',
};

export const NETWORK_CONFIG_URL = {
  xnet: 'https://xnet.agoric.net/network-config',
  ollinet: 'https://ollinet.agoric.net/network-config',
}

export const DEFAULT_TIMEOUT = 3 * 60 * 1000;
export const AGORIC_ADDR_RE = /agoric1.{38}/;
