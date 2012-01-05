var heritable = require('./object-utils').heritable;
var Iterable = require('./Iterable').Iterable;
var IterableIterator = require('./Iterable').IterableIterator;

var Dict = require('./Dict');


var Page = heritable({
  constructor: function Page(contents){
    if (typeof contents === 'string') {
      contents = contents.split(/\r\n|\n|\r/);
    }
    this.pushall(contents);
  },
  super: Array,
  toString: function(){ return this.join('\n') },
  pushall: function(arr){ this.push.apply(this, arr) },
  padEnd: function(count){ while (count--) this.push(''); }
});

var Results = module.exports = heritable({
  constructor: function Results(contents){
    if (typeof contents === 'string') {
      contents = contents.split(/\r\n|\n|\r/);
    }
    this.contents = contents || [];
    PageSets.set(this, new Dict);
  },
  super: Object,

  bisect: function bisect(divisor){
    if (PageSets.get(this).has(divisor)) {
      return PageSets.get(this).get(divisor);
    }

    var pages = new PageSet;

    if (this.contents.length === 0) {
      var page = new Page([]);
      page.padEnd(divisor);
      pages.add(0, page);
      return pages;
    }

    var chunks = this.contents.length / divisor + 1 | 0;
    for (var i = 0; i < chunks; i++) {
      var lines = this.contents.slice(i * divisor, (i + 1) * divisor);
      var page = new Page(lines);
      if (page.length < divisor) {
        page.padEnd(divisor - page.length);
      }
      pages.add(i, page);
    }
    PageSets.get(this).set(divisor, pages);
    return pages;
  }
});


var PageSets = new Map;


var PageSet = heritable({
  constructor: function PageSet(){
    this.iterable = this;
    this.iterator = this.__iterator__();
  },
  super: Iterable
});



Object.getOwnPropertyNames(IterableIterator.prototype).forEach(function(prop){
  if (typeof IterableIterator.prototype[prop] === 'function') {
    PageSet.prototype[prop] = function(){
      return this.iterator[prop].apply(this.iterator, arguments);
    }
  }
});