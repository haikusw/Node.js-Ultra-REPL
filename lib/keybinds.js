
module.exports = function keybinds(target){
  target.rli.input.on('keypress', contextKeys.bind(target));
}

var keybinds = {
  pagedown: { '': 'nextContext' },
  pageup:   { '': 'prevContext' },
  delete:   { shift: 'deleteContext' },
  insert:   { shift: 'createContext' },
  one:      { ctrl: 'hiddens' }
};

function contextKeys(line, key){
  if (!key || !(key.name in keybinds)) return;

  var actions = {};
  var commands = keybinds[key.name];

  key[''] = true;
  for (var mod in key) {
    if (key[mod] === true && mod in commands) {
      var val = this[commands[mod]]();
      if (val) {
        actions[mod] = val;
      }
    }
  }

  return actions;
}