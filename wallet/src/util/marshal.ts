import { makeMarshal } from '@endo/marshal';
import { decodeToJustin } from '@endo/marshal';

const { serialize } = makeMarshal();

export const stringify = (x, pretty = false) =>
  decodeToJustin(JSON.parse(serialize(harden(x)).body), pretty);
