import {
  maybeLoad,
  maybeSave,
  watchKey,
  OFFERS_STORAGE_KEY,
} from '../util/storage';
import { SmartWalletKey } from './Dapps';

export enum OfferUIStatus {
  proposed = 'proposed',
  accepted = 'accept',
  rejected = 'rejected',
  pending = 'pending',
  declined = 'decline',
  refunded = 'refunded',
}

import { OfferConfig } from '@agoric/web-components/src/dapp-wallet-bridge/DappWalletBridge';
export type Offer = {
  id: number;
  requestContext: {
    origin: string;
  };
  status: OfferUIStatus;
  sourceDescription?: string;
  spendAction?: string;
  error?: unknown;
} & OfferConfig;

export const loadOffers = ({ chainId, address }: SmartWalletKey) =>
  maybeLoad([OFFERS_STORAGE_KEY, chainId, address]) ?? [];

export const addOffer = (
  { chainId, address }: SmartWalletKey,
  offer: Offer,
) => {
  const offers = loadOffers({ chainId, address }) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    [...offers.filter(o => o.id !== offer.id), offer],
  );
};

export const removeOffer = (
  { chainId, address }: SmartWalletKey,
  id: number,
) => {
  const offers = loadOffers({ chainId, address }) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    offers.filter(o => o.id !== id),
  );
};

export const watchOffers = (
  { chainId, address }: SmartWalletKey,
  onChange: (newOffers: Offer[]) => void,
) => {
  watchKey([OFFERS_STORAGE_KEY, chainId, address], (newOffers: Offer[]) =>
    onChange(newOffers ?? []),
  );
};
