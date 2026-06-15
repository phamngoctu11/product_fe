// sockjs-client still expects the Node-style global alias in browser tests.
(globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis;
