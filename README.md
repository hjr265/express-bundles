# Express Bundles

Express Bundles is a dumb asset bundling middleware for Express. It provides a simple solution for small needs only.

The middleware works by intercepting each request for a bundled asset and determines if the bundle is ready and up to date. If not, it builds the bundle and stores it in the appropriate directory, allowing the static middleware to serve it. Only the first request for each bundle is slow, due to the build process; subsequent requests are almost instanteneous.

## Installation

    $ npm install express-bundles

## Options

* `env`

  Any value other than `'production'` will prevent the middleware from bundling the assets.

* `src`

  The middleware reads and stores all assets and bundles within the directory addressed here.

* `bundles`

  An object defining each bundle as an array of assets or bundles.

* `hooks`

  Functions associated to particular file extensions. The bundler passes the contents of a read file through an appropriate hook during the build process.

## Usage

To use it, add the express-bundles middleware somewhere above the static middleware

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

You can use `bundles.emit` from within your templates to get an array of asset names for each bundle. In production environment, the list will contain only 1 name, that is of the bundle. For any other environment, it will be an array of the asset names that the bundle is built from.

    doctype 5
    html
      head
        title= title
        for name in bundles.emit('css/combined.css')
          link(rel='stylesheet', href='/#{name}')
      body
        block content
        for name in bundles.emit('js/bundle.js')
          script(src='/#{name}')

## Examples

Before trying any example, execute

    $ npm install

## TODO

* Write tests

## License

FreeBSD