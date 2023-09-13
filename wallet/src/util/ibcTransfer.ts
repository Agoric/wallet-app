import { OfflineSigner } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { AssetInfo } from './ibc-assets';
import { KnownNetworkConfigUrls } from './connections';
import { fetchChainInfo } from './chainInfo';

const secondsUntilTimeout = 300;

const timeoutTimestampSeconds = () =>
  Math.round(Date.now() / 1000) + secondsUntilTimeout;

export const agoricChainId = 'agoric-3';
const agoricGas = '500000';

export const sendIbcTokens = async (
  assetInfo: AssetInfo,
  rpc: string,
  signer: OfflineSigner,
  amount: string,
  from: string,
  to: string,
  gas: string,
) => {
  const { sourceChannel, sourcePort, denom } = assetInfo;

  const client = await SigningStargateClient.connectWithSigner(rpc, signer);

  return client.sendIbcTokens(
    from,
    to,
    {
      amount,
      denom,
    },
    sourcePort,
    sourceChannel,
    undefined,
    timeoutTimestampSeconds(),
    {
      amount: [{ amount: '0', denom }],
      gas,
    },
  );
};

export const withdrawIbcTokens = async (
  assetInfo: AssetInfo,
  amount: string,
  from: string,
  to: string,
) => {
  // @ts-expect-error window keys
  const { keplr } = window;
  const { rpc } = await fetchChainInfo(KnownNetworkConfigUrls.main);
  const signer = await keplr.getOfflineSignerOnlyAmino(agoricChainId);

  return sendIbcTokens(assetInfo, rpc, signer, amount, from, to, agoricGas);
};
