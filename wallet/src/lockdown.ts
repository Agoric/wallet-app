/** @file copied into HTML template to do lockdown before app load */

// Allow the React dev environment to extend the console for debugging
// features.
// @ts-expect-error template
// eslint-disable-next-line no-constant-condition
const consoleTaming = '%NODE_ENV%' === 'development' ? 'unsafe' : 'safe';
// @ts-expect-error template
// eslint-disable-next-line no-constant-condition
const errorTaming = '%NODE_ENV%' === 'development' ? 'unsafe' : 'safe';

lockdown({
  errorTaming,
  overrideTaming: 'severe',
  consoleTaming,
});

console.log('lockdown done.');

window.addEventListener('unhandledrejection', ev => {
  ev.stopImmediatePropagation();
});
