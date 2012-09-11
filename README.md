EchoEcho
========

Simple server reponse echoer to help when testing.

The idea of `echoecho` is to provide a relative URL listener
for any node `http` object and have it return a predictable
response.

Install
-------

    npm i echoecho


Build Status
------------

[![Travis Build Status](https://secure.travis-ci.org/davglass/echoecho.png?branch=master)](http://travis-ci.org/davglass/echoecho)

Default Routes
--------------

* `get` - GET Request
* `post` - POST Request with data
* `put` - PUT with data
* `delete` - DELETE with data
* `status` - Special status route `echo/status/403` returns a `403`, all `http.STATUS_CODES` supported
* `delay` - Special delay route `echo/delay/2` returns a 200 delayed by 2 seconds.

Using in Your Server
--------------------

__I recommend using it with Express/Connect to get a properly parsed body for POST/PUT requests__

There are 3 things you need to do inside the Node server providing these tests:

* Tell `echoecho` your relative paths to scan
* Check to see if `echoecho` can repond to a request
* Have `echoecho` serve the request

Here's a simple example, assuming your tests serve from `/build/tests/mine/index.html`

```

//Prepping once
//Tell echoecho to serve from these base paths
echoecho.paths([
    '/build/tests/mine/index.html' //echoecho will serve from /build/tests/mine/
]);

//From inside your request handler, like http.createServer or express.createServer

if (echoecho.handle(req.url)) { //Can echoecho respond to this?
    echoecho.serve(req, res); //Pass in the request and response objects and echoecho will take it from here
} else {
    //throw your 404
}

```

Using in Your Tests
-------------------

Now that your server is accepting `echoecho` responses, you can start using them in your HTML tests like this:

From index.html you can use relative URL's that start with `echo` and then contain your route.

* `echo/status/200`
* `echo/status/500`
* `echo/get?foo=bar&good=bad`
* `echo/post`

That's it, `echoecho` should return what it was given

Extending
---------

`echoecho` has an internal "scheme" that you can add methods to inside your personal server.

`echoecho.scheme` contains an Object liternal of paths as keys and function handlers as values.

```

echoecho.scheme.get = function(req, res) { ... };

```

Right now, these are the route in the echo router: `echo/ROUTE/etc`, I may end up added regex support for this
but for the inital version I didn't need them.
