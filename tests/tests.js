var vows = require('vows'),
    assert = require('assert'),
    http = require('http'),
    echoecho = require('../lib/echo');


//Server to test against.
var server = http.createServer(function(req, res) {
    if (echoecho.handle(req)) {
        echoecho.serve(req, res);
    } else {
        res.writeHead(200);
        res.end('DEFAULT');
    }
});
server.listen(8181);

var baseURL = 'http://127.0.0.1:8181/';

var fetch = function(o, callback) {
    var err = null,
        method = o.method || 'get',
        fn = method.toUpperCase();

    var headers = { };

    if (o.body) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers['Content-Length'] = o.body.length;
    }

    var request = http.request({
        url: '127.0.0.1',
        port: 8181,
        path: o.path,
        method: method,
        headers: headers
    }, function(res) {
        var data = '';
        res.on('data', function(c) {
            data += c;
        });
        res.on('end', function() {
            callback(err, {
                body: data,
                headers: res.headers,
                code: res.statusCode
            });
        });
    }).on('error', function(e) {
        err = e;
    });

    if (o.body) {
        request.write(o.body);
    }

    request.end();
};


var tests = {
    'should be loaded': {
        topic: function () {
            return echoecho
        },
        'and have load method': function (topic) {
            assert.isFunction(topic.load);
        },
        'and have handle method': function (topic) {
            assert.isFunction(topic.handle);
        },
        'and have serve method': function (topic) {
            assert.isFunction(topic.serve);
        },
        'and have paths method': function (topic) {
            assert.isFunction(topic.paths);
        },
        'and have scheme object': function (topic) {
            assert.isObject(topic.scheme);
        },
        'and have BASE object': function (topic) {
            assert.isObject(topic.BASE);
        },
        'and should load paths': {
            topic: function() {
                echoecho.paths([
                    '/foo/bar/baz/index.html',
                    '/foo/bar/bat/',
                    '/foo/bar/not'
                ]);
                return echoecho.BASE;
            },
            "and has 3 paths": function(topic) {
                assert.equal(Object.keys(topic).length, 3);
            },
            "and removes .html": function(topic) {
                assert.isTrue(topic['/foo/bar/baz']);
            },
            "and removes trailing slash": function(topic) {
                assert.isTrue(topic['/foo/bar/bat']);
            },
            "and handles no trailing slash": function(topic) {
                assert.isTrue(topic['/foo/bar/not']);
            },
            "and default response": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/'
                    }, this.callback);
                },
                "should be returned": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'DEFAULT');
                }
            },
            "and get status 200": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/status/200'
                    }, this.callback);
                },
                "with OK body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'OK');
                }
            },
            "and get status 404": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/status/404'
                    }, this.callback);
                },
                "with Not Found body": function(topic) {
                    assert.equal(topic.code, 404);
                    assert.equal(topic.body, 'Not Found');
                }
            },
            "and get query": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/get?foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and get mismatch": {
                topic: function() {
                    fetch({
                        method: 'POST',
                        path: '/foo/bar/baz/echo/get?foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 403);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and post": {
                topic: function() {
                    fetch({
                        method: 'POST',
                        path: '/foo/bar/baz/echo/post',
                        body: 'foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and post mismatch": {
                topic: function() {
                    fetch({
                        method: 'PUT',
                        path: '/foo/bar/baz/echo/post',
                        body: 'foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 403);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and delete": {
                topic: function() {
                    fetch({
                        method: 'DELETE',
                        path: '/foo/bar/baz/echo/delete',
                        body: 'foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and delete mismatch": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/delete',
                        body: 'foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 403);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and put": {
                topic: function() {
                    fetch({
                        method: 'PUT',
                        path: '/foo/bar/baz/echo/put',
                        body: 'foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and put mismatch": {
                topic: function() {
                    fetch({
                        method: 'PUT',
                        path: '/foo/bar/baz/echo/post',
                        body: 'foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 403);
                    assert.equal(topic.body, 'foo=bar');
                }
            }
        }
    }
};

vows.describe('echoecho').addBatch(tests).export(module);
