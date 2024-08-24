export const mnemonics = {
  user1:
    'tackle hen gap lady bike explain erode midnight marriage wide upset culture model select dial trial swim wood step scan intact what card symptom',
  user2:
    'orbit bench unit task food shock brand bracket domain regular warfare company announce wheel grape trust sphere boy doctor half guard ritual three ecology',
  gov1: 'such field health riot cost kitten silly tube flash wrap festival portion imitate this make question host bitter puppy wait area glide soldier knee',
  gov2: 'physical immune cargo feel crawl style fox require inhale law local glory cheese bring swear royal spy buyer diesel field when task spin alley',
};

export const accountAddresses = {
  user1: 'agoric1ydzxwh6f893jvpaslmaz6l8j2ulup9a7x8qvvq',
  user2: 'agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md',
  gov1: 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q',
  gov2: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
};

/*
 * DEFAULT_TIMEOUT: timeout for actions involving waiting for DOM elements.
 * DEFAULT_TASK_TIMEOUT: timeout for custom commands in support.js.
 *
 * Many tests use both (waiting for DOM elements and custom commands).
 * Using both timeouts for such tests can help ensure stability,
 * especially when running the tests with Emerynet.
 */
export const DEFAULT_TIMEOUT = 3 * 60 * 1000;
export const DEFAULT_TASK_TIMEOUT = 3 * 60 * 1000;
export const DEFAULT_EXEC_TIMEOUT = 3 * 60 * 1000;
export const MINUTE_MS = 1 * 60 * 1000;
export const AGORIC_ADDR_RE = /agoric1.{38}/;
export const AGORIC_NET = Cypress.env('AGORIC_NET') || 'emerynet';

export const flattenObject = (obj, parentKey = '', result = {}) => {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        flattenObject(obj[key], newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

export const FACUET_HEADERS = {
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Content-Type': 'application/x-www-form-urlencoded',
};
