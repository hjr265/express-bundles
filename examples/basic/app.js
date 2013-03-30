
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , expressBundles = require('./../..')
  , stylus = require('stylus');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(expressBundles.middleware({
    env: app.get('env'),
    src: path.join(__dirname, 'public'),
    bundles: {
      'css/combined.css': [
        'css/bootstrap.css',
        'css/screen.css'
      ],
      'css/screen.css': [
        'css/screen.styl'
      ],
      'js/bundle.js': [
        'js/jquery.js',
        'js/bootstrap.js',
        'js/main.js'
      ]
    },
    hooks: {
      '.styl': function(file, data, done) {
        stylus.render(data, done);
      }
    }
  }));
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
