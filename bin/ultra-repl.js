#!/usr/bin/env node
var path = require('path');
var ScopedModule = require('../lib/ScopedModule');

var UltraREPL = ScopedModule._load(path.resolve(__dirname, '../lib/UltraREPL.js'), null, true);
new UltraREPL;
