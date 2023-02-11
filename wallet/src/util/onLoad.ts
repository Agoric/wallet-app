export const onLoadP = new Promise<void>(res => {
  if (document.readyState === 'complete') {
    res();
  } else {
    window.addEventListener('load', () => res());
  }
});
