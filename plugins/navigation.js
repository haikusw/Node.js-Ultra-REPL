module.exports = [
  { name: 'Next Page',
    help: 'Next page of results.',
    defaultTrigger: { type: 'keybind', trigger: 'pgdn' },
    action: function(){
      if (this.pages.count() > 0) {
        this.rli.writePage(this.pages.next());
        this.header();
      }
    }
  },
  { name: 'Previous Page',
    help: 'Previous page of results.\n',
    defaultTrigger: { type: 'keybind', trigger: 'pgup' },
    action: function(){
      if (this.pages.count() > 0) {
        this.rli.writePage(this.pages.previous());
        this.header();
      }
    }
  },
  { name: 'Delete Left',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'bksp' },
    action: function(){ this.rli._deleteLeft() }
  },
  { name: 'Delete Right',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'del' },
    action: function(){ this.rli._deleteRight() }
  },
  { name: 'Delete Word Left',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+bksp' },
    action: function(){ this.rli._deleteWordLeft() }
  },
  { name: 'Delete Word Right',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+del' },
    action: function(){ this.rli._deleteWordRight() }
  },
  { name: 'Delete Line Left',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+shift+bksp' },
    action: function(){ this.rli._deleteLineLeft() }
  },
  { name: 'Delete Line Right',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+shift+del' },
    action: function(){ this.rli._deleteLineRight() }
  },
  { name: 'Line Left',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'home' },
    action: function(){ this.rli._lineLeft() }
  },
  { name: 'Line Right',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'end' },
    action: function(){ this.rli._lineRight() }
  },
  { name: 'Word Left',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+left' },
    action: function(){ this.rli._wordLeft() }
  },
  { name: 'Word Right',
    defaultTrigger: { type: 'keybind', trigger: 'ctrl+right' },
    action: function(){ this.rli._wordRight() }
  },
  { name: 'Move Left',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'left' },
    action: function(){ this.rli._moveLeft() }
  },
  { name: 'Move Right',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'right' },
    action: function(){ this.rli._moveRight() }
  },

  { name: 'History Prev',
    defaultTrigger: { type: 'keybind', trigger: 'up' },
    action: function(){ this.rli._historyPrev() }
  },
  { name: 'History Next',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'down' },
    action: function(){ this.rli._historyNext() }
  },
  { name: 'Line',
    help: false,
    defaultTrigger: { type: 'keybind', trigger: 'enter' },
    action: function(){ this.rli._line() }
  },
  // { name: 'Tab Complete',
  //   action: function(){ this.rli._tabComplete() }
  // },
]