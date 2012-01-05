var path = require('path');
var fs = require('fs');
var child_process = require('child_process');


var props = module.exports.properties = [
                'target', 'cwd', 'style', 'args',
                'icon', 'description', 'hotkey' ];

var styles = module.exports.styles = [
               'Hidden', 'Normal', 'Minimized', 'Maximized',
               'Normal unfocused', 'Minimized unfocused' ];

var special = module.exports.specialFolders = [
                'AllUsersDesktop', 'AllUsersStartMenu', 'AllUsersPrograms', 'AllUsersStartup',
                'Desktop', 'Favorites', 'Fonts', 'MyDocuments', 'NetHood', 'PrintHood',
                'Programs', 'Recent','SendTo', 'StartMenu', 'Startup', 'Templates' ];


module.exports.createShortcut = function createShortcut(options){ return new Shortcut(options) }


function Shortcut(options){
  Object.keys(Shortcut.prototype).forEach(function(k){
    if (k in options) this[k] = options[k];
  }, this);
}

Shortcut.prototype = {
  location: '',
  target: '',
  startIn: process.cwd(),
  style: 'Normal',

  create: function(callback){
    var script = './' + Date.now() + '.js';

    fs.writeFileSync(script, this.toString());

    child_process.exec('cscript //NoLogo ' + script, function(err, out){
      fs.unlink(script);
      callback(err, out);
    });
  },

  toString: function(){
    var properties = props.map(function(p){
      if (typeof this[p] === 'undefined') return '';
      return 's.'+propMap[p]+' = '+this.format(p, this[p])+';\n';
    }, this).join('')
    return [ 'var ws = WScript.CreateObject("WScript.Shell");',
             'var s = ws.CreateShortcut(' + this.format('location') + ' + "\\\\' + this.format('linkname')+'");',
              properties,
             's.Save(); WScript.Echo(s);' ].join('\n');
  },

  format: function(name){
    return formatters[name].call(this, this[name]);
  }
};

Object.defineProperties(Shortcut.prototype, {
  toString: { enumerable: false },
  format: { enumerable: false },
  create: { enumerable: false }
});


var propMap = {
  target:      'TargetPath',
  cwd:         'WorkingDirectory',
  style:       'WindowStyle',
  args:        'Arguments',
  icon:        'IconLocation',
  description: 'Description',
  hotkey:      'Hotkey'
};


var q = ['"', "'"];
var qMatch = [/(')/g, /(")/g];

function quotes(s) {
  if (typeof s === 'undefined') return "''";
  s = String(s).replace(/\\/g, '\\\\');
  var qWith = +(s.match(qMatch[0]) === null);
  return q[qWith] + s.replace(qMatch[1-qWith], '\\$1') + q[qWith];
}


var formatters = {
  location: function(v){
    if (~special.indexOf(v)) {
      return 'ws.SpecialFolders("'+v+'")';
    } else {
      return quotes(path.resolve(v));
    }
  },
  style: function(v){
    var index = styles.indexOf(this.style);
    return ~index ? index : 1;
  },
  linkname: function(v){
    return path.basename((v || this.target).slice(0, this.target.indexOf('.') + 1) + 'lnk');
  },
  cwd: function(v){
    return quotes(path.resolve(this.target).slice(0, -path.basename(this.target).length));
  },
  target: quotes,
  args: quotes,
  description: quotes,
  hotkey: quotes
}