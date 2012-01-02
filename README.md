# UltraREPL

The goal of UltraREPL is to be a JavaScript development environment, not just a toy or a simple debugger. Developing JS code inside of JavaScript itself enables a lot of powerful options that are otherwise difficult or cumbersome. The problem is Node's existing REPL doesn't provide the tools needed to take advantage of this potential, and there's not really any other options aside from (albiet awesome) browser based environments like [Ace](http://ace.ajax.org/).

# Installation and Startup

UltraREPL is designed to work with zero configuration as long as Node is installed. To get it you can clone it from this repo or simply install it with npm:
```
npm install ultra-repl
```
If installed with npm it should be set up to run in your path. I've yet to see this work in Windows, however, so I've tried to make it as easy as possible regardless. For direct loading you can go to `ultra-repl/bin` where you'll find the .js file which can be run directly on OS X or Linux, and a .cmd file which can be run like an executable on Windows.

You should be greeted with something similar to this upon starting it:

![startup](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss1.png)


# Basic Usage

To begin with it has all the features Node's built-in REPL does. You write JavaScript, it evaluates it and shows the result. The simplest command is `this` which will spit out the global context and everything in it. The formatting differences are immediately obvious.

![this](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss8.png)

## Commands

In the module folder is a `settings` folder with the `controls.js` file. This file is easily editable bindings and commands can be edited as you please. Any action can be a keybind or a command, it's up to you.

Most settings are unique per context, like depth, hiddens, builtins. There will be a way to set up defaults or presets soon.

```
 Command List        f1               Shows this list.
 Create Context      ctrl+shift+up    Create, initialize, and switch into a new V8 context.
 Delete Context      ctrl+shift+down  Delete the current V8 context and all objects unreferences externally.
 Next Context        ctrl+up          Switch to the previous next.
 Previous Context    ctrl+down        Switch to the previous context.
 Reset Context       ctrl+r           Reset current context.
 Label Context       .label           Change the label of the current context.

 Next Page           pgdn             Next page of results.
 Previous Page       pgup             Previous page of results.

 Toggle Builtins     f3               Toggle whether default built-in objects are shown.
 Toggle Colors       ctrl+f4          Toggle whether output is colored.
 Toggle Hiddens      f2               Toggle whether hidden properties are shown.
 Inspect Depth--     - -              Decrease inspector recurse depth
 Inspect Depth++     + +              Increase inspector recurse depth
 Toggle Key Display  f4               Toggle displaying what keys are pressed for checking keybindings.

 Clear Input/Screen  esc              Clear the the input line if it has text or clears the screen if not.
 Clear Screen        esc esc          Clear the screen.
 Exit                esc esc esc      Exit the REPL.

 Inject REPL         f5               Adds a reference to the live repl object to the current context.
 Require             .r               Require for contexts without exposing require to the context. If passed two parameters the
                                      first is used to name it globally. If exports it a named function its name will be used.
 Auto-Includer                        Type the name of a built-in module to include it on the current context.
```
The builtin and hidden toggles are particularly useful.

![hiddens](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss3.png)

![no builtins](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss4.png)


## Keybindings

UltraREPL supports fully customizable keybindings that provide a lot of room to speed up workflow. Every user exposed command can be bound to any set of keys or a repl keyword. ctrl+alt+shift+key combos are possible for a keys excluding number pad. F keys works. All of the default handlers have been removed so that signal interrupts are customizable or skippable.

Beyond normal keybindings, UltraREPL also supports what I'm calling Cadances. That is a set of keybindings executed in order to create a new binding. For example, the default bindings have Clear Input as `esc`, Clear Window as `esc esc` and Quit as `esc esc esc`. Similar to how the sig interrupt functions, but fully customizable with any combination of keys, any amount in order, and to execute any command. Simply string keybinds together with spaces to indicate a Cadance.

Keybindings are found in the settings folder and are easy to edit.

Current defaults:
![defaults](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss7.png)


## Contexts

On startup the context is set to the default global one where Node initializes itself and where nearly all things usually run under normal usage. From here you keep using the global context or create a new one by hitting the keybind (F1 shows the commands). When a context is created it immediately is switched to. At this point all commands and actions which will be run in this context as if it is the one and only global one. Creating, switching, deleting, and resetting contexts is done by a keybinds and is always instantaneous.

There are some things that are (currently) shared between contexts. Required modules, `process`, the various `ArrayBuffer` constructors, Node's `Buffer`, and the four timer functions, because currently Node doesn't provide a good way to make multiple copies. In the near future it will be changed, one way or another, so that nothing is required to be shared between contexts. Right now it's not required those items be copied, it's simply that if they are to be in multiple contexts then they are shared.

Everything else is unique per context: native objects and any code you run yourself. It is generally possible to put objects on multiple contexts but there are some things that don't work, like trying to run Object.* functions from one context on objects in another one.

![no builtins](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss5.png)

You can make and use as many contexts as you want.

![no builtins](https://raw.github.com/Benvie/Node.js-Ultra-REPL/master/docs/ss6.png)


## In Progress

* GUI-like interface with collapsable object views
* State/setting indicators
* Multi-line code input so you can actually develop in this
* Better tools for saving/loading/editing/running code from files
* Tools to easily add and edit commands/modules for the REPL itself
* Integration with external tools like npm