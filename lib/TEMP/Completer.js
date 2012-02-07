var builtins = require('../lib/builtins');


var fnRegex = /\s*function\s*/;
REPLServer.prototype.memory = function memory (cmd) {
  this.lines = this.lines || [];
  this.lines.level = this.lines.level || [];

  if (!cmd) {
    this.lines.push('');
    return this.lines.level = [];
  }

  this.lines.push('  '.repeat(this.lines.level.length) + cmd);

  var dw = cmd.match(/{|\(/g);
  var up = cmd.match(/}|\)/g);
  up = up ? up.length : 0;
  dw = dw ? dw.length : 0;
  var depth = dw - up;

  depth && function workIt(){
    if (depth === 0) return;
    if (depth > 0) return this.lines.level.push({
      depth: depth,
      line: this.lines.length - 1,
      isFunction: fnRegex.test(cmd)
    });

    var tmp, curr = this.lines.level.pop();
    if (curr && (tmp = this.depth + depth) !== 0) {
      if (tmp > 0) {
        curr.depth += depth;
        return this.lines.level.push(curr);
      }
      depth += curr.depth;
      workIt.call(this);
    }
  }.call(this);
};


REPLServer.prototype.complete = function(line, callback) {

  var completions;

  // list of completion lists, one for each inheritance "level"
  var completionGroups = [];

  var completeOn, match, filter, i, j, group, c;

  // REPL commands (e.g. ".break").
  var match = null;
  match = line.match(/^\s*(\.\w*)$/);
  if (match) {
    completionGroups.push(Object.keys(this.commands));
    completeOn = match[1];
    if (match[1].length > 1) {
      filter = match[1];
    }

    completionGroupsLoaded();
  } else if (match = line.match(requireRE)) {
    // require('...<Tab>')
    //TODO: suggest require.exts be exposed to be introspec registered
    //extensions?
    //TODO: suggest include the '.' in exts in internal repr: parity with
    //`path.extname`.
    var exts = ['.js', '.node'];
    var indexRe = new RegExp('^index(' + exts.map(regexpEscape).join('|') +
                             ')$');

    completeOn = match[1];
    var subdir = match[2] || '';
    var filter = match[1];
    var dir, files, f, name, base, ext, abs, subfiles, s;
    group = [];
    var paths = module.paths.concat(require('module').globalPaths);
    for (i = 0; i < paths.length; i++) {
      dir = path.resolve(paths[i], subdir);
      try {
        files = fs.readdirSync(dir);
      } catch (e) {
        continue;
      }
      for (f = 0; f < files.length; f++) {
        name = files[f];
        ext = path.extname(name);
        base = name.slice(0, -ext.length);
        if (base.match(/-\d+\.\d+(\.\d+)?/) || name === '.npm') {
          // Exclude versioned names that 'npm' installs.
          continue;
        }
        if (exts.indexOf(ext) !== -1) {
          if (!subdir || base !== 'index') {
            group.push(subdir + base);
          }
        } else {
          abs = path.resolve(dir, name);
          try {
            if (fs.statSync(abs).isDirectory()) {
              group.push(subdir + name + '/');
              subfiles = fs.readdirSync(abs);
              for (s = 0; s < subfiles.length; s++) {
                if (indexRe.test(subfiles[s])) {
                  group.push(subdir + name);
                }
              }
            }
          } catch (e) {}
        }
      }
    }
    if (group.length) {
      completionGroups.push(group);
    }

    if (!subdir) {
      completionGroups.push(builtins.libs);
    }

    completionGroupsLoaded();

  // Handle variable member lookup.
  // We support simple chained expressions like the following (no function
  // calls, etc.). That is for simplicity and also because we *eval* that
  // leading expression so for safety (see WARNING above) don't want to
  // eval function calls.
  //
  //   foo.bar<|>     # completions for 'foo' with filter 'bar'
  //   spam.eggs.<|>  # completions for 'spam.eggs' with filter ''
  //   foo<|>         # all scope vars with filter 'foo'
  //   foo.<|>        # completions for 'foo' with filter ''
  } else if (line.length === 0 || line[line.length - 1].match(/\w|\.|\$/)) {
    match = simpleExpressionRE.exec(line);
    if (line.length === 0 || match) {
      var expr;
      completeOn = (match ? match[0] : '');
      if (line.length === 0) {
        filter = '';
        expr = '';
      } else if (line[line.length - 1] === '.') {
        filter = '';
        expr = match[0].slice(0, match[0].length - 1);
      } else {
        var bits = match[0].split('.');
        filter = bits.pop();
        expr = bits.join('.');
      }

      // console.log("expression completion: completeOn='" + completeOn +
      //             "' expr='" + expr + "'");

      // Resolve expr and get its completions.
      var obj, memberGroups = [];
      if (!expr) {
        // If context is instance of vm.ScriptContext
        // Get global vars synchronously
        if (this.useGlobal ||
            this.context.constructor &&
            this.context.constructor.name === 'Context') {
          completionGroups.push(Object.getOwnPropertyNames(this.context));
          addStandardGlobals();
          completionGroupsLoaded();
        } else {
          this.eval('.scope', this.context, 'repl', function(err, globals) {
            if (err || !globals) {
              addStandardGlobals();
            } else if (Array.isArray(globals[0])) {
              // Add grouped globals
              globals.forEach(function(group) {
                completionGroups.push(group);
              });
            } else {
              completionGroups.push(globals);
              addStandardGlobals();
            }
            completionGroupsLoaded();
          });
        }

        function addStandardGlobals() {
          completionGroups.push(builtins.js);
          if (filter) {
            completionGroups.push(builtins.keywords);
          }
        }

      } else {
        this.eval(expr, this.context, 'repl', function(e, obj) {
          // if (e) console.log(e);

          if (obj != null) {
            if (typeof obj === 'object' || typeof obj === 'function') {
              memberGroups.push(Object.getOwnPropertyNames(obj));
            }
            // works for non-objects
            try {
              var p = Object.getPrototypeOf(obj);
              var sentinel = 5;
              while (p !== null) {
                memberGroups.push(Object.getOwnPropertyNames(p));
                p = Object.getPrototypeOf(p);
                // Circular refs possible? Let's guard against that.
                sentinel--;
                if (sentinel <= 0) {
                  break;
                }
              }
            } catch (e) {
              //console.log("completion error walking prototype chain:" + e);
            }
          }

          if (memberGroups.length) {
            for (i = 0; i < memberGroups.length; i++) {
              completionGroups.push(memberGroups[i].map(function(member) {
                return expr + '.' + member;
              }));
            }
            if (filter) {
              filter = expr + '.' + filter;
            }
          }

          completionGroupsLoaded();
        });
      }
    } else {
      completionGroupsLoaded();
    }
  }

  // Will be called when all completionGroups are in place
  // Useful for async autocompletion
  function completionGroupsLoaded(err) {
    if (err) throw err;

    // Filter, sort (within each group), uniq and merge the completion groups.
    if (completionGroups.length && filter) {
      var newCompletionGroups = [];
      for (i = 0; i < completionGroups.length; i++) {
        group = completionGroups[i].filter(function(elem) {
          return elem.indexOf(filter) == 0;
        });
        if (group.length) {
          newCompletionGroups.push(group);
        }
      }
      completionGroups = newCompletionGroups;
    }

    if (completionGroups.length) {
      var uniq = {};  // unique completions across all groups
      completions = [];
      // Completion group 0 is the "closest"
      // (least far up the inheritance chain)
      // so we put its completions last: to be closest in the REPL.
      for (i = completionGroups.length - 1; i >= 0; i--) {
        group = completionGroups[i];
        group.sort();
        for (var j = 0; j < group.length; j++) {
          c = group[j];
          if (!hasOwnProperty(c)) {
            completions.push(c);
            uniq[c] = true;
          }
        }
        completions.push(''); // separator btwn groups
      }
      while (completions.length && completions[completions.length - 1] === '') {
        completions.pop();
      }
    }

    callback(null, [completions || [], completeOn]);
  }
};