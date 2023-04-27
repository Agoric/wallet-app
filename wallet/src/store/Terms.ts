import { TERMS_KEY, maybeSave, maybeLoad } from '../util/storage';

// The index of the current revision of the terms agreement. This should
// increment every time the terms change.
export const LATEST_TERMS_INDEX = 1;

export const agreeToTerms = (index: number) => maybeSave(TERMS_KEY, index);

export const getTermsIndexAccepted = () => maybeLoad(TERMS_KEY) ?? -1;
