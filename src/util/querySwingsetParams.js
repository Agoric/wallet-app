// @ts-check
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryClientImpl } from '@agoric/cosmic-proto/swingset/query.js';

import { HttpClient, Tendermint34Client } from '@cosmjs/tendermint-rpc';

/**
 * Query swingset params.
 *
 * @param {String|import('@cosmjs/tendermint-rpc').HttpEndpoint} endpoint
 * @returns {Promise<import('@agoric/cosmic-proto/swingset/query.js').QueryParamsResponse>}
 */
export const querySwingsetParams = async endpoint => {
  const http = new HttpClient(endpoint);
  const trpc = await Tendermint34Client.create(http);
  const base = QueryClient.withExtensions(trpc);
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return queryService.Params({});
};
