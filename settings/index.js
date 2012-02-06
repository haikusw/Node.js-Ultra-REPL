module.exports = {
	style: require('./styling'),
	options: require('./options'),
	controls: require('./controls')(
    function keywords(x){ return { type: 'keywords', trigger: x } },
    function command(x){ return { type: 'command', trigger: x } },
    function keybind(x){ return { type: 'keybind', trigger: x } },
    function match(x){ return { type: 'match', trigger: x } }
  ),
	text: require('./text')
};