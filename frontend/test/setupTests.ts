import '@testing-library/jest-dom';
import { Buffer } from 'node:buffer';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});

const { window } = dom;

for (const key of Object.getOwnPropertyNames(window)) {
  if (!(key in globalThis)) {
    // @ts-ignore
    globalThis[key] = window[key];
  }
}

if (!globalThis.window) {
  // @ts-ignore
  globalThis.window = window;
}

if (!globalThis.document) {
  globalThis.document = window.document;
}

if (!globalThis.atob) {
  globalThis.atob = (data) => Buffer.from(data, 'base64').toString('binary');
}

if (!globalThis.btoa) {
  globalThis.btoa = (data) => Buffer.from(data, 'binary').toString('base64');
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;

  globalThis.localStorage = storage;
  if (typeof window !== 'undefined') {
    window.localStorage = storage;
  }
}
