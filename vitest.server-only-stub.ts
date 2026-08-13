// Stub for the `server-only` package during tests. The real package throws if
// imported from a client bundle; under vitest (node) it just needs to resolve
// to a no-op so server modules can be unit-tested.
export {};
