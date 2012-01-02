#!/usr/bin/env node
var UltraREPL = require('../').UltraREPL;

var fs = require('fs');
var util = require('util');

try {
	new UltraREPL
} catch (e) {
	fs.writeFileSync('error.log', util.inspect(e, true) + '\n' + util.inspect(global, true, 4));
}

