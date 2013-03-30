var async = require('async')
  , fs = require('fs')
  , path = require('path')
  , cleanCss = require('clean-css')
  , uglifyJs = require('uglify-js')

exports.middleware = function(options) {
  var bundles = {}
  Object.keys(options.bundles).forEach(function(name) {
    bundles[name] = {
      name: name,
      path: path.join(options.src, name),
      files: options.bundles[name].map(function(name) {
        return {
          name: name,
          path: path.join(options.src, name)
        }
      })
    }
  })

  // Checks if any file under @bundle has changed
  function check(bundle, done) {
    async.some(bundle.files, function(file, done) {
      var bundle = bundles[file.name]
      if(bundle) {
        // @file is another bundle, check it
        check(bundle, function(err, changed) {
          done(changed)
        })
        return
      }

      // Compare mtime
      fs.stat(file.path, function(err, stats) {
        if(err) {
          done(true)
          return
        }

        // Store mtime in a temporary property
        file.ttime = stats.mtime
        done(!file.mtime || stats.mtime - file.mtime)
      })

    }, function(changed) {
      done(null, changed)
    })
  }

  function build(bundle, done) {
    // check bundle for change
    check(bundle, function(err, changed) {
      if(err) {
        done(err)
        return
      }

      if(!changed) {
        // @bundle hasn't changed, rebuild unnecessary
        done()
        return
      }

      // merge all file data
      async.map(bundle.files, function(file, done) {
        var bundle = bundles[file.name]
        if(bundle) {
          // @file is a bundle, build it
          build(bundle, function(err, data) {
            if(err) {
              done(err)
              return
            }

            // read file, add to memo
            fs.readFile(bundle.path, {
              encoding: 'utf8'
            }, function(err, data) {
              if(err) {
                done(err)
                return
              }
              done(null, data)
            })
          })
          return
        }

        // read file, run it through hook if defined
        fs.readFile(file.path, {
          encoding: 'utf8'
        }, function(err, data) {
          if(err) {
            done(err)
            return
          }

          var ext = path.extname(file.name)
          var hook = options.hooks[ext]
          if(hook) {
            // hook defined, use it
            hook(file, data, function(err, data) {
              if(err) {
                done(err)
                return
              }
              done(null, data)
            })
            return;
          }

          done(null, data)
        })
      }, function(err, results) {
        if(err) {
          done(err)
          return
        }

        // update each file's mtime
        bundle.files.forEach(function(file) {
          file.mtime = file.ttime
        })

        // save bundle
        save(bundle.name, results, function(err) {
          if(err) {
            done(err)
            return
          }
          done(null, results)
        })
      })
    })
  }

  function save(name, data, done) {
    switch(path.extname(name)) {
    case '.css':
      // minify css
      data = cleanCss.process(data.join('\n'))
      fs.writeFile(path.join(options.src, name), data, done)
      break

    case '.js':
      // mangle and minify js
      var ast = null
      data.forEach(function(code) {
        ast = uglifyJs.parse(code, {
          toplevel: ast
        })
      })
      ast.figure_out_scope()
      ast = ast.transform(uglifyJs.Compressor({
        warnings: false
      }))
      ast.figure_out_scope()
      ast.compute_char_frequency()
      ast.mangle_names()
      data = ast.print_to_string({
        comments: /^\/*!/
      })
      fs.writeFile(path.join(options.src, name), data, done)
      break
    }
  }

  return function(req, res, next) {
    res.locals.bundles = {}

    switch(options.env) {
    case 'development':
      res.locals.bundles.emit = function(name) {
        // emit each file in bundle
        return bundles[name].files.map(function(file) {
          return file.name
        })
      }
      break
    
    default:
      res.locals.bundles.emit = function(name) {
        // emit bundled file
        return [
          name
        ]
      }
      break
    }

    var bundle = bundles[path.relative('/', req.url)]
    if(!bundle) {
      // not a bundle, skip it
      next()
      return
    }

    build(bundle, function(err) {
      next(err)
    })
  }
}