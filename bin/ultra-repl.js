#!/usr/bin/env node

var ScopedModule = require('../lib/ScopedModule');

module = new ScopedModule;
module.__proto__ = ScopedModule.prototype;
process.mainModule.__proto__ = ScopedModule.prototype;


var UltraREPL = require('../lib/UltraREPL');
new UltraREPL;