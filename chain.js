'use strict';

class WrappedObject {
  constructor(obj) {
    this.wrapped = obj;
  }

  map(fn) {
    if (typeof(fn) === 'string') {
      this.wrapped = this.wrapped.map(v => v[fn]);
    } else {
      this.wrapped = this.wrapped.map(fn);
    }
    return this;
  }
  filter(fn) { this.wrapped = this.wrapped.filter(fn); return this; }
  reduce(fn, base) { this.wrapped = this.wrapped.reduce(fn, base); return this; }
  mapValues(fn) {
    for (const k in this.wrapped) {
      this.wrapped[k] = fn(this.wrapped[k], k);
    }
    return this;
  }
  sum(fn) {
    return this.reduce((a, b) => a + b, 0).value();  // auto-close
  }

  value() {
    return this.wrapped;
  }
}

function chain(obj) {
  return new WrappedObject(obj);
}

module.exports = chain;
