// Allow the React dev environment to extend the console for debugging
// features.
// @ts-expect-error template
// eslint-disable-next-line no-constant-condition
const consoleTaming = '%NODE_ENV%' === 'development' ? 'unsafe' : 'safe';
// @ts-expect-error template
// eslint-disable-next-line no-constant-condition
const errorTaming = '%NODE_ENV%' === 'development' ? 'unsafe' : 'safe';

// eslint-disable-next-line no-restricted-properties
const { pow: mathPow } = Math;
// eslint-disable-next-line no-restricted-properties
Math.pow = (base, exp) =>
  typeof base === 'bigint' && typeof exp === 'bigint'
    ? base ** exp
    : mathPow(base, exp);

lockdown({
  errorTaming,
  overrideTaming: 'severe',
  consoleTaming,
});

console.log('lockdown done.');

window.addEventListener('unhandledrejection', ev => {
  ev.stopImmediatePropagation();
});
