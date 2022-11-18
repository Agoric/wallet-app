import { fromBech32, toBech32, fromBase64, toBase64 } from '@cosmjs/encoding';
import {
  DirectSecp256k1Wallet,
  EncodeObject,
  Registry,
} from '@cosmjs/proto-signing';
import {
  AminoTypes,
  defaultRegistryTypes,
  QueryClient,
  createProtobufRpcClient,
  assertIsDeliverTxSuccess,
  createBankAminoConverters,
  createAuthzAminoConverters,
  StdFee,
  AminoConverters,
} from '@cosmjs/stargate';

import { GenericAuthorization } from 'cosmjs-types/cosmos/authz/v1beta1/authz.js';
import { QueryClientImpl } from 'cosmjs-types/cosmos/authz/v1beta1/query.js';

import {
  MsgProvision,
  MsgWalletAction,
  MsgWalletSpendAction,
} from '@agoric/cosmic-proto/swingset/msgs.js';

import { stableCurrency, bech32Config } from './chainInfo.js';
import type { ChainInfo, Keplr } from '@keplr-wallet/types';

export function toAccAddress(address: string): Uint8Array {
  return fromBech32(address).data;
}

const KEY_SIZE = 32; // as in bech32

// XXX domain of @agoric/cosmic-proto
/**
 * non-exhaustive list of powerFlags
 *
 * See also MsgProvision in golang/cosmos/proto/agoric/swingset/msgs.proto
 */
export const PowerFlags = /** @type {const} */ {
  SMART_WALLET: 'SMART_WALLET',
};

/**
 * The typeUrl of a message pairs a package name with a message name.
 * For example, from:
 *
 * package cosmos.authz.v1beta1;
 * message MsgGrant { ... }
 *
 * we get `/cosmos.authz.v1beta1.MsgGrant`
 *
 * https://github.com/cosmos/cosmos-sdk/blob/main/proto/cosmos/authz/v1beta1/tx.proto#L34
 * https://github.com/cosmos/cosmos-sdk/blob/00805e564755f696c4696c6abe656cf68678fc83/proto/cosmos/authz/v1beta1/tx.proto#L34
 */
const CosmosMessages = /** @type {const} */ {
  bank: {
    MsgSend: {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    },
  },
  authz: {
    MsgGrant: {
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
    },
    GenericAuthorization: {
      typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
    },
    MsgExec: {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
    },
  },
  feegrant: {
    MsgGrantAllowance: {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance',
    },
    BasicAllowance: {
      typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
    },
  },
};

/**
 * `/agoric.swingset.XXX` matches package agoric.swingset in swingset/msgs.proto
 * aminoType taken from Type() in golang/cosmos/x/swingset/types/msgs.go
 */
export const SwingsetMsgs = /** @type {const} */ {
  MsgProvision: {
    typeUrl: '/agoric.swingset.MsgProvision',
    aminoType: 'swingset/Provision',
  },
  MsgWalletAction: {
    typeUrl: '/agoric.swingset.MsgWalletAction',
    aminoType: 'swingset/WalletAction',
  },
  MsgWalletSpendAction: {
    typeUrl: '/agoric.swingset.MsgWalletSpendAction',
    aminoType: 'swingset/WalletSpendAction',
  },
};

// XXX repeating the TS definitions made by protoc
// TODO define these automatically from those
/**
 * @typedef {{
 *   nickname: string,
 *   address: string, // base64 of raw bech32 data
 *   powerFlags: string[],
 *   submitter: string, // base64 of raw bech32 data
 * }} Provision
 * @typedef {{
 *   owner: string, // base64 of raw bech32 data
 *   action: string,
 * }} WalletAction
 * @typedef {{
 *   owner: string, // base64 of raw bech32 data
 *   spendAction: string,
 * }} WalletSpendAction
 */

export const SwingsetRegistry = new Registry([
  ...defaultRegistryTypes,
  // XXX should this list be "upstreamed" to @agoric/cosmic-proto?
  [SwingsetMsgs.MsgProvision.typeUrl, MsgProvision],
  [SwingsetMsgs.MsgWalletAction.typeUrl, MsgWalletAction],
  [SwingsetMsgs.MsgWalletSpendAction.typeUrl, MsgWalletSpendAction],
]);

/**
 * TODO: estimate fee? use 'auto' fee?
 * https://github.com/Agoric/agoric-sdk/issues/5888
 */
export const zeroFee = (): StdFee => {
  const { coinMinimalDenom: denom } = stableCurrency;
  const fee = {
    amount: [{ amount: '0', denom }],
    gas: '300000', // TODO: estimate gas?
  };
  return fee;
};

const dbg = label => x => {
  console.log(label, x);
  return x;
};

export const SwingsetConverters: AminoConverters = {
  [SwingsetMsgs.MsgProvision.typeUrl]: {
    aminoType: SwingsetMsgs.MsgProvision.aminoType,
    toAmino: protoVal => {
      const { nickname, address, powerFlags, submitter } = dbg(
        'provision toAmino protoVal',
      )(protoVal);
      return {
        address: toBech32(
          bech32Config.bech32PrefixAccAddr,
          fromBase64(address),
        ),
        nickname,
        powerFlags,
        submitter: toBech32(
          bech32Config.bech32PrefixAccAddr,
          fromBase64(submitter),
        ),
      };
    },
    fromAmino: aminoVal => {
      const { nickname, address, powerFlags, submitter } = dbg(
        'provision fromAmino aminoVal',
      )(aminoVal);
      return {
        address: toBase64(toAccAddress(address)),
        nickname,
        powerFlags,
        submitter: toBase64(toAccAddress(submitter)),
      };
    },
  },
  [SwingsetMsgs.MsgWalletAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: ({ action, owner }) => ({
      action,
      owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
    }),
    fromAmino: ({ action, owner }) => ({
      action,
      owner: toBase64(toAccAddress(owner)),
    }),
  },
  [SwingsetMsgs.MsgWalletSpendAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletSpendAction.aminoType,
    toAmino: ({ spendAction, owner }) => ({
      spend_action: spendAction,
      owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
    }),
    fromAmino: ({ spend_action: spendAction, owner }) => ({
      spendAction,
      owner: toBase64(toAccAddress(owner)),
    }),
  },
};

export const BROWSER_STORAGE_KEY = 'agoric.wallet.backgroundSignerKey';

/**
 * Maintain a key for signing non-spending messages in localStorage.
 *
 * See also `delegateWalletAction()` below.
 */
export const makeBackgroundSigner = async ({
  localStorage,
  csprng,
}: {
  localStorage: typeof window.localStorage;
  csprng: typeof import('@cosmjs/crypto').Random.getBytes;
}) => {
  const provideLocalKey = () => {
    const stored = localStorage.getItem(BROWSER_STORAGE_KEY);
    if (stored) {
      return fromBase64(stored);
    }
    console.debug(
      `localStorage.setItem(${BROWSER_STORAGE_KEY}, Random.getBytes(${KEY_SIZE}))`,
    );
    const seed = csprng(KEY_SIZE);
    localStorage.setItem(BROWSER_STORAGE_KEY, toBase64(seed));
    return seed;
  };
  const seed = provideLocalKey();
  const wallet = await DirectSecp256k1Wallet.fromKey(
    seed,
    bech32Config.bech32PrefixAccAddr,
  );

  const accounts = await wallet.getAccounts();
  console.debug('device account(s):', accounts);

  const [{ address }] = accounts;

  /**
   * Query grants for granter / grantee pair
   *
   * For example, to check whether `delegateWalletAction()` is necessary.
   *
   * @param granter address
   * @param rpcClient
   */
  const queryGrants = async (
    granter: string,
    rpcClient: import('@cosmjs/tendermint-rpc').Tendermint34Client,
  ): Promise<GenericAuthorization[]> => {
    const base = QueryClient.withExtensions(rpcClient);
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    console.log('query Grants', { granter, grantee: address });
    const result = await queryService.Grants({
      granter,
      grantee: address,
      msgTypeUrl: '', // wildcard
    });

    const decoded = result.grants.flatMap(grant =>
      grant.authorization
        ? [GenericAuthorization.decode(grant.authorization.value)]
        : [],
    );

    return decoded;
  };

  return harden({
    address,
    registry: SwingsetRegistry,
    wallet,
    queryGrants,
  });
};
export type BackgroundSigner = Awaited<ReturnType<typeof makeBackgroundSigner>>;

/**
 * @param granter bech32 address
 * @param grantee bech32 address
 * @param seconds expiration as seconds (Date.now() / 1000)
 */
const makeGrantWalletActionMessage = (
  granter: string,
  grantee: string,
  seconds: number,
) => {
  return {
    typeUrl: CosmosMessages.authz.MsgGrant.typeUrl,
    value: {
      granter,
      grantee,
      grant: {
        authorization: {
          typeUrl: CosmosMessages.authz.GenericAuthorization.typeUrl,
          value: GenericAuthorization.encode(
            GenericAuthorization.fromPartial({
              msg: SwingsetMsgs.MsgWalletAction.typeUrl,
            }),
          ).finish(),
        },
        expiration: { seconds },
      },
    },
  };
};

/**
 * TODO: test this, once we have a solution for cosmjs/issues/1155
 *
 * @param granter bech32 address
 * @param grantee bech32 address
 * @param allowance number of uist (TODO: fix uist magic string denom)
 * @param seconds expiration as seconds (Date.now() / 1000)
 */
const makeFeeGrantMessage = (
  granter: string,
  grantee: string,
  allowance: string,
  seconds: number,
) => {
  return {
    typeUrl: CosmosMessages.feegrant.MsgGrantAllowance.typeUrl,
    value: {
      granter,
      grantee,
      allowance: {
        typeUrl: CosmosMessages.feegrant.BasicAllowance.typeUrl,
        value: {
          spendLimit: [{ denom: 'uist', amount: allowance }],
          expiration: { seconds },
        },
      },
    },
  };
};

const makeExecMessage = (
  grantee: string,
  msgObjs: EncodeObject[],
  registry: Registry,
) => {
  const msgs = msgObjs.map(obj => ({
    typeUrl: obj.typeUrl,
    value: registry.encode(obj),
  }));
  return {
    typeUrl: CosmosMessages.authz.MsgExec.typeUrl,
    value: { grantee, msgs },
  };
};

/**
 * Make Exec messages for grantee to do WalletAction on behalf of granter
 */
export const makeExecActionMessages = (
  granter: string,
  grantee: string,
  action: string,
): EncodeObject[] => {
  const act1 = {
    typeUrl: SwingsetMsgs.MsgWalletAction.typeUrl,
    value: {
      owner: toBase64(toAccAddress(granter)),
      action,
    },
  };
  const msgs = [makeExecMessage(grantee, [act1], SwingsetRegistry)];
  return msgs;
};

/**
 * Use Keplr to sign offers and delegate object messaging to local storage key.
 *
 * Ref: https://docs.keplr.app/api/
 */
export const makeInteractiveSigner = async (
  chainInfo: ChainInfo,
  keplr: Keplr,
  connectWithSigner: typeof import('@cosmjs/stargate').SigningStargateClient.connectWithSigner,
) => {
  const { chainId } = chainInfo;

  const key = await keplr.getKey(chainId);

  // Until we have SIGN_MODE_TEXTUAL,
  // Use Amino because Direct results in ugly protobuf in the keplr UI.
  const offlineSigner = await keplr.getOfflineSignerOnlyAmino(chainId);
  console.log('InteractiveSigner', { offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();
  const { address } = account;

  const converters = {
    ...SwingsetConverters,
    ...createBankAminoConverters(),
    ...createAuthzAminoConverters(),
  };
  const signingClient = await connectWithSigner(chainInfo.rpc, offlineSigner, {
    aminoTypes: new AminoTypes(converters),
    registry: SwingsetRegistry,
  });
  console.debug('InteractiveSigner', { signingClient });

  const fee = zeroFee();

  return harden({
    address, // TODO: address can change
    isNanoLedger: key.isNanoLedger,

    /**
     * TODO: integrate support for fee-account in MsgExec
     * https://github.com/cosmos/cosmjs/issues/1155
     * https://github.com/cosmos/cosmjs/pull/1159
     *
     * @param {string} grantee
     * @param {number} t0 current time (as from Date.now()) as basis for 4hr expiration
     */
    delegateWalletAction: async (grantee, t0) => {
      const expiration = t0 / 1000 + 4 * 60 * 60;
      // TODO: parameterize allowance?
      const allowance = '250000'; // 0.25 IST

      // TODO: support for fee-account in MsgExec
      console.warn(
        'cannot yet makeFeeGrantMessage',
        makeFeeGrantMessage(address, grantee, allowance, expiration),
        '(using feeGrantWorkAround)',
      );

      const feeGrantWorkAround = {
        typeUrl: CosmosMessages.bank.MsgSend.typeUrl,
        value: {
          fromAddress: address,
          toAddress: grantee,
          amount: [{ denom: 'ubld', amount: '25000' }],
        },
      };

      const msgs: EncodeObject[] = [
        // TODO: makeFeeGrantMessage(address, grantee, allowance, expiration),
        feeGrantWorkAround,
        makeGrantWalletActionMessage(address, grantee, expiration),
      ];

      console.log('sign Grant', { address, msgs, fee });
      const tx = await signingClient.signAndBroadcast(address, msgs, fee);
      console.log('Grant sign result tx', tx);
      assertIsDeliverTxSuccess(tx);

      return tx;
    },

    /**
     * Sign and broadcast Provision for a new smart wallet
     *
     * @throws if account does not exist on chain, user cancels,
     *         RPC connection fails, RPC service fails to broadcast (
     *         for example, if signature verification fails)
     */
    submitProvision: async () => {
      const { accountNumber, sequence } = await signingClient.getSequence(
        address,
      );
      console.log({ accountNumber, sequence });

      const b64address = toBase64(toAccAddress(address));

      const act1 = {
        typeUrl: SwingsetMsgs.MsgProvision.typeUrl,
        /** @type {Provision} */
        value: {
          address: b64address,
          nickname: 'my wallet',
          powerFlags: [PowerFlags.SMART_WALLET],
          submitter: b64address,
        },
      };

      const msgs = [act1];
      console.log('sign provision', { address, msgs, fee });

      const tx = await signingClient.signAndBroadcast(address, msgs, fee);
      console.log('spend action result tx', tx);
      assertIsDeliverTxSuccess(tx);

      return tx;
    },

    /**
     * Sign and broadcast WalletSpendAction
     *
     * @param spendAction marshaled offer
     * @throws if account does not exist on chain, user cancels,
     *         RPC connection fails, RPC service fails to broadcast (
     *         for example, if signature verification fails)
     */
    submitSpendAction: async (spendAction: string) => {
      const { accountNumber, sequence } = await signingClient.getSequence(
        address,
      );
      console.log({ accountNumber, sequence });

      const act1 = {
        typeUrl: SwingsetMsgs.MsgWalletSpendAction.typeUrl,
        /** @type {WalletSpendAction} */
        value: {
          owner: toBase64(toAccAddress(address)),
          spendAction,
        },
      };

      const msgs = [act1];
      console.log('sign spend action', { address, msgs, fee });

      const tx = await signingClient.signAndBroadcast(address, msgs, fee);
      console.log('spend action result tx', tx);
      assertIsDeliverTxSuccess(tx);

      return tx;
    },
  });
};

export type InteractiveSigner = Awaited<
  ReturnType<typeof makeInteractiveSigner>
>;
