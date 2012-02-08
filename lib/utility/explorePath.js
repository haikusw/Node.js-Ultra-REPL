var path = require('path');
var fs = require('fs');

var slice = Function.prototype.call.bind(Array.prototype.slice);
var exists =  fs.exists || path.exists;
var existsSync = fs.existsSync || path.existsSync;

var isWin = process.platform === 'win32';

if (fs.exists && isWin) {
  exists = function(p,cb){ return fs.exists(path._makeLong(p),cb) }
  existsSync = function(p){ return fs.existsSync(path._makeLong(p)) }
}

var cache = [{},{}];
var existCache = {};

module.exports = function explorePath(path, lazy){
  return new Path(path, lazy);
};

function Path(request, lazy){
  this.path = Array.isArray(request) ? path.resolve.apply(null, request) : path.resolve(request);

  if (this.path in cache[+!lazy]) return cache[+!lazy][this.path];
  cache[+!lazy][this.path] = this;

  this.define('lazy', !!lazy, true);
  if (!lazy) {
    this.getExtname();
    this.getDirname();
    this.getBasename();
    this.getSplit();
  }
}

Path.separator = isWin ? [/[\/\\]/, '\\'] : [/\//, '/'];

Path.prototype = {
  constructor: Path,

  getExtname: function getExtname(){
    return 'extname' in this ? this.extname : this.define('extname', path.extname(this.path));
  },
  getDirname: function getDirname(){
    return 'dirname' in this ? this.dirname : this.define('dirname', path.dirname(this.path));
  },
  getBasename: function getBasename(){ 
    return 'basename' in this ? this.basename : this.define('basename', path.basename(this.path));
  },
  getStats: function getStats(){
    return 'stats' in this ? this.stats : this.define('stats', fs.statSync(this.path));
  },

  getSplit: function getSplit(){
    if (!('split' in this)) {
      this.define('split', this.path.split(Path.separator[0]));
      if (isWin) {
        this.define('drive', this.split.shift());
      }
    }
    return this.split;
  },

  getType: function getType(){
    if ('type' in this) return this.type;
    if (!this.exists()) return null;
    var stats = this.getStats();
    return this.define('type', stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : null);
  },

  getParent: function getParent(){
    if ('parent' in this) return this.parent;

    this.define('parent', new Path(path.resolve(this.path, '..'), this.lazy));
    if (this.parent === this) {
      this.define('root', true);
    }
    this.parent.define('type', 'directory');
    return this.parent;
  },

  resolve: function resolve(){
    return new Path(path.resolve.apply(null, [this.path].concat(slice(arguments))));
  },

  removeExt: function removeExt(){
    return this.getBasename().slice(0, -this.getExtname().length);
  },

  relative: function relative(to){
    return path.relative(this.path, to);
  },

  toUnix: function toUnix(){
    return '/'+this.split.join('/');
  },

  toWin: function toWin(){
    return [this.drive ? this.drive : 'C:'].concat(this.split).join('\\');
  },

  toIdentifier: function toIdentifier(){
    return this.getBasename().slice(0,-this.getExtname().length).replace(/[^\w]+(.)?/g, function(m,c){
      return c ? c.toUpperCase() : '';
    });
  },

  toString: function toString(){
    return this.path;
  },

  exists: function exists(){
    if (existCache[this.path]) return existCache[this.path][0];
    existCache[this.path] = [
      existsSync(this.path),
      setTimeout(function(){ delete existCache[this.path] }.bind(this), 10000)
    ];
    return existCache[this.path][0];
  },

  isDirectory: function isDirectory(){
    return this.getType() === 'directory';
  },

  isFile: function isDirectory(){
    return this.getType() === 'file';
  },

  read: function read(cb){
    switch (this.getType()) {

      case 'directory':
        return fs.readdirSync(this.path).map(function(file){
          file = new Path(this.path + Path.separator[1] + file, this.lazy);
          return cb ? cb(file) : file;
        }, this);

      case 'file':
        var file = fs.readFileSync(this.path);
        return cb ? cb(file) : file;

      default:
        return cb ? cb(null) : null;
    }
  }
};


Path.prototype.__proto__ = {
  define: function define(name, value, hidden, readonly){
    if (arguments.length === 2) {
      hidden = this.constructor.prototype === this;
    }
    Object.defineProperty(this, name, {
      value: value,
      enumerable: !hidden,
      writable: !readonly,
      configurable: true
    });
    return value;
  }
};

function hide(o,p){
  if (!p) return Object.keys(o).map(hide.bind(null, o));
  if (Array.isArray(p)) return p.map(hide.bind(null, o));
  Object.defineProperty(o, p, { enumerable: false });
}

hide(Path.prototype);
hide(Object.getPrototypeOf(Path.prototype));