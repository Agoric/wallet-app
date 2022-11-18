export const formatDateNow = (stamp: number) => {
  if (!stamp) {
    return 'unknown time';
  }
  const date = new Date(stamp);
  const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  const isoDate = new Date(isoStamp);
  const isoStr = isoDate.toISOString();
  const match = isoStr.match(/^(.*)T(.*)\..*/);
  assert(match);
  return `${match[1]} ${match[2]}`;
};
