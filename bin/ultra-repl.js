#!/usr/bin/env node --harmony

var UltraREPL = require('../').UltraREPL;

// put the repl on the process for testing convenience, but it's not required
// and does nothing special aside from give you an easy access route between contexts

Object.defineProperty(process, 'repl', {
	value: new UltraREPL,
	configurable: true,
	writable: true
});