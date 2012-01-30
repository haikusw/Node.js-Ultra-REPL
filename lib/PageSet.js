var Dict = require('./Dict');
var Group = require('./Group');

module.exports = Results;

function Results(contents){
  if (typeof contents === 'string') {
    contents = contents.split(/\r\n|\n|\r/);
  }
  this.contents = contents || [];
}

Results.prototype = {
  bisect: function bisect(divisor){
    var pages = new Group;

    if (this.contents.length === 0) {
      var page = new Page([]);
      page.padEnd(divisor);
      pages.append(page);
      return pages;
    }

    var chunks = this.contents.length / divisor + 1 | 0;
    for (var i = 0; i < chunks; i++) {
      var lines = this.contents.slice(i * divisor, (i + 1) * divisor);
      var page = new Page(lines);
      if (page.length < divisor) {
        page.padEnd(divisor - page.length);
      }
      pages.append(page);
    }
    return pages;
  }
};


function Page(contents){
  if (typeof contents === 'string') {
    contents = contents.split(/\r\n|\n|\r/);
  }
  var page = [];
  page.__proto__ = Page.prototype;
  page.pushall(contents);
  return page;
}

Page.prototype = {
  constructor: Page,
  __proto__: Array.prototype,
  toString: function toString(){ return this.join('\n') },
  pushall: function pushall(arr){ this.push.apply(this, arr) },
  padEnd: function padEnd(count){ while (count--) this.push(''); }
}
