#!/usr/bin/env node
// var tty = require('tty');
var UltraREPL = require('../').UltraREPL;
// var stream = {
// 	stdin: new tty.ReadStream(0),
// 	stdout: new tty.WriteStream(1)
// };
// //stream.stdout._type = 'tty';
// stream.stdin.resume();
new UltraREPL
//new UltraREPL({ stream: stream })