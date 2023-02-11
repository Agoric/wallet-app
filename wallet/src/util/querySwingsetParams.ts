import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import {
  QueryClientImpl,
  QueryParamsResponse,
} from '@agoric/cosmic-proto/swingset/query.js';

import {
  HttpClient,
  HttpEndpoint,
  Tendermint34Client,
} from '@cosmjs/tendermint-rpc';

/**
 * Query swingset params.
 */
export const querySwingsetParams = async (
  endpoint: HttpEndpoint,
): Promise<QueryParamsResponse> => {
  const http = new HttpClient(endpoint);
  const trpc = await Tendermint34Client.create(http);
  /**
   * XXX
   *
   * Argument of type
   * 'import("~/wallet-app/wallet/node_modules/@cosmjs/tendermint-rpc/build/tendermint34/tendermint34client").Tendermint34Client'
   * is not assignable to parameter of type
   * 'import("~/wallet-app/wallet/node_modules/@cosmjs/stargate/node_modules/@cosmjs/tendermint-rpc/build/tendermint34/tendermint34client").Tendermint34Client'.
   * Types have separate declarations of a private property 'client'.
   */
  // @ts-expect-error
  const base = QueryClient.withExtensions(trpc);
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return queryService.Params({});
};
