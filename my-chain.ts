declare module 'chain' {
  interface WrappedValue<T> {
    value(): T;
  }

  interface WrappedObject<T> extends WrappedValue<T> {
    mapValues<K extends keyof T, U>(fn: (v: T[K], k: K) => U): WrappedObject<{[k in keyof T]: U}>;
    map<K extends keyof T, U>(fn: (x: T[K], k: K) => U): WrappedArray<U>;
    filter<K extends keyof T>(fn: (x: T[K], k: K) => boolean): WrappedArray<T[K]>;
  }

  interface WrappedArray<T> extends WrappedValue<T[]> {
    map<U>(fn: (x: T) => U): WrappedArray<U>;
    filter(fn: (x: T) => boolean): WrappedArray<T>;

    reduce<U>(fn: (acc: U[], v: T) => U[], base: U[]): WrappedArray<U>;
    reduce<U extends object>(fn: (acc: U[], v: T) => U[], base: U[]): WrappedObject<U>;
    reduce<U>(fn: (acc: U, v: T) => U, base: U): WrappedValue<U>;

    sum(): T;  // ideally this would only work for string or number.
  }

  function chain<T>(obj: T[]): WrappedArray<T>;
  function chain<T extends object>(obj: T): WrappedObject<T>;
  function chain<T>(obj: T): WrappedValue<T>;

  export default chain;
}
