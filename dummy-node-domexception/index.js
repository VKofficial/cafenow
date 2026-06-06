// Native DOMException is available globally in Node.js v15+ and modern browsers.
// This mock eliminates the dependency on the deprecated 'node-domexception' NPM library.
module.exports = globalThis.DOMException;
