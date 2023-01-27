import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { QueryClientImpl } from 'cosmjs-types/cosmos/bank/v1beta1/query';
import type { Coin } from '@cosmjs/stargate';
import type { HttpEndpoint } from '@cosmjs/tendermint-rpc';

// UNTIL casting supports this query. This is sub-optimal because it doesn't
// support batching, load-balancing, or proofs.
export const queryBankBalances = async (
  address: string,
  rpc: HttpEndpoint,
): Promise<Coin[]> => {
  const tendermint = await Tendermint34Client.connect(rpc);
  const queryClient = new QueryClient(tendermint);
  const rpcClient = createProtobufRpcClient(queryClient);
  const bankQueryService = new QueryClientImpl(rpcClient);

  const { balances } = await bankQueryService.AllBalances({
    address,
  });

  return balances;
};
