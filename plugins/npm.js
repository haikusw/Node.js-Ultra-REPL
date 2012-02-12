var npm = require('npm');

npm.load(function(e,NPM){
  npm.on('output', function(){ npm.output = null });
  npm = NPM;
});


module.exports = [
  { name: 'NPM Search',
    help: 'Search NPM for modules matching the given term.',
    defaultTrigger: api.command('.search'),
    action: function(cmd, term){
      npm.search(term, function(e, data){
        this.writer(data);
      }.bind(this))
    }
  }
];
