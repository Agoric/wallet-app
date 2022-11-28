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
): QueryParamsResponse => {
  const http = new HttpClient(endpoint);
  const trpc = await Tendermint34Client.create(http);
  const base = QueryClient.withExtensions(trpc);
  const rpc = createProtobufRpcClient(base);
  const queryService = new QueryClientImpl(rpc);

  return queryService.Params({});
};
