#!/usr/bin/env node

var ScopedModule = require('../core/ScopedModule');

module.__proto__ = ScopedModule.prototype;
process.mainModule.__proto__ = ScopedModule.prototype;

function init(){
	var UltraREPL = require('../core/UltraREPL');
	new UltraREPL;
}


init();