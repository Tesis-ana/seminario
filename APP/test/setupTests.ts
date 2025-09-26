process.env.NODE_ENV = 'test';

(globalThis as any).__DEV__ = true;

if (typeof globalThis.setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: (...args: any[]) => void, ...args: any[]) => setTimeout(fn, 0, ...args);
}

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

export {};
