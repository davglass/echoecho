var vows = require('vows'),
    assert = require('assert'),
    http = require('http'),
    parse = require('url').parse,
    qs = require('querystring'),
    fs = require('fs'),
    echoecho = require('../lib/echo'),
    ip = process.env.IP || '127.0.0.1',
    port = process.env.PORT || 8181;


//Server to test against.
var server = http.createServer(function(req, res) {
    var conf = {
        dirroot: __dirname
    };
    if (req.url.indexOf('-express') > -1) {
        conf = null;
        var p = parse(req.url);
        req.url = req.url.replace('-express', '');
        req.body = qs.parse(p.query);
        echoecho.serve(req, res, conf);
    } else if (echoecho.handle(req)) {
        echoecho.serve(req, res, conf);
    } else {
        if (req.url.indexOf('skipthisrequest') > -1) {
            echoecho.serve(req, res, conf);
        } else {
            res.writeHead(200);
            res.end('DEFAULT');
        }
    }
});
server.listen(port);

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
        url: ip,
        port: port,
        path: o.path,
        method: fn,
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
        'and have EchoEcho Function': function (topic) {
            assert.isFunction(topic.EchoEcho);
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
            'and use handler with object': {
                topic: function() {
                    return echoecho.handle({
                        url: '/foo/bar/baz/echo/status/500'
                    });
                },
                'should return true': function(topic) {
                    assert.isTrue(topic);
                }
            },
            'and use handler with string': {
                topic: function() {
                    return echoecho.handle('/foo/bar/baz/echo/jsonp');
                },
                'should return true': function(topic) {
                    assert.isTrue(topic);
                }
            },
            'and use validator with object': {
                topic: function() {
                    return echoecho.validate({
                        url: '/foo/bar/baz/echo/status/500'
                    });
                },
                'should return true': function(topic) {
                    assert.equal(topic, '500');
                }
            },
            'and use validator with string': {
                topic: function() {
                    return echoecho.validate('/foo/bar/baz/echo/jsonp');
                },
                'should return true': function(topic) {
                    assert.equal(topic, 'jsonp');
                }
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
                    assert.equal(topic.headers['access-control-allow-origin'], '*');
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
                    assert.equal(topic.headers['access-control-allow-origin'], '*');
                    assert.equal(topic.code, 404);
                    assert.equal(topic.body, 'Not Found');
                }
            },
            "and get status asdf": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/status/asdf'
                    }, this.callback);
                },
                "with Not Found body": function(topic) {
                    assert.equal(topic.code, 500);
                    assert.equal(topic.body, 'Unknown Echo Status');
                }
            },
            "and get unknown scheme route": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/asdfasdf'
                    }, this.callback);
                },
                "with Not Found body": function(topic) {
                    assert.equal(topic.code, 404);
                    assert.equal(topic.body, 'Not Found');
                }
            },
            "and get no scheme route": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/'
                    }, this.callback);
                },
                "with Not Found body": function(topic) {
                    assert.equal(topic.code, 404);
                    assert.equal(topic.body, 'Not Found');
                }
            },
            "and get unknown scheme route that is unhandled": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/skipthisrequest'
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
                    assert.equal(topic.headers['access-control-allow-origin'], '*');
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and get no query": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/get'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.headers['access-control-allow-origin'], '*');
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, '');
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
            "and post with no body": {
                topic: function() {
                    fetch({
                        method: 'POST',
                        path: '/foo/bar/baz/echo/post',
                        body: ''
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 204);
                    assert.equal(topic.body, '');
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
                        path: '/foo/bar/baz/echo/delete?foo=bar'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo=bar');
                }
            },
            "and delete with no query": {
                topic: function() {
                    fetch({
                        method: 'DELETE',
                        path: '/foo/bar/baz/echo/delete'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, '');
                }
            },
            "and delete mismatch": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/delete?foo=bar'
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
            },
            "and get default json": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/json'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, '{ "echo": true }');
                }
            },
            "and post default json": {
                topic: function() {
                    fetch({
                        method: 'POST',
                        path: '/foo/bar/baz/echo/json'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, '{ "echo": true }');
                }
            },
            "and get custom json": {
                topic: function() {
                    var self = this,
                        url = '/foo/bar/baz/echo/json?foo=bar&baz=world';

                    fetch({
                        method: 'GET',
                        path: url
                    }, function(err, data) {
                        var q = parse(url);
                        data.expected = JSON.stringify(qs.parse(q.query));
                        self.callback(err, data);
                    });
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.headers['content-type'], 'application/json');
                    assert.equal(topic.body, topic.expected);
                }
            },
            "and post custom json": {
                topic: function() {
                    var self = this,
                        body = 'foo=bar&baz=world&do=not',
                        url = '/foo/bar/baz/echo/json?' + body;

                    fetch({
                        method: 'POST',
                        path: url,
                        body: body
                    }, function(err, data) {
                        data.expected = JSON.stringify(qs.parse(body));
                        self.callback(err, data);
                    });
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.headers['content-type'], 'application/json');
                    assert.equal(topic.body, topic.expected);
                }
            },
            'and handle invalid custom json': {
                topic: function() {
                    fetch({
                        path: '/foo/bar/baz/echo/json?response=invalidJSON'
                    }, this.callback);
                },
                'with query body': function(res) {
                    assert.equal(res.body, 'Bad Request');
                }
            },
            "and post custom json, express style": {
                topic: function() {
                    var self = this,
                        body = 'foo=bar&baz=world&do=not',
                        url = '/foo/bar/baz/echo/json-express?' + body;

                    fetch({
                        method: 'POST',
                        path: url,
                        body: body
                    }, function(err, data) {
                        data.expected = JSON.stringify(qs.parse(body));
                        self.callback(err, data);
                    });
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.headers['content-type'], 'application/json');
                    assert.equal(topic.body, topic.expected);
                }
            },
            "and get default jsonp": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/jsonp?callback=baz'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'baz({"echo":true,"callback":"baz"});');
                }
            },
            "and get default jsonp with empty querystring (?&callback=baz)": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/jsonp?&callback=baz'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal('baz({"echo":true,"callback":"baz"});', topic.body);
                }
            },
            "and get default jsonp without callback": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/jsonp?baz'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 403);
                    var b = JSON.parse(topic.body);
                    assert.equal(b.echo, 'error, no callback');
                }
            },
            "and post default jsonp": {
                topic: function() {
                    fetch({
                        method: 'POST',
                        path: '/foo/bar/baz/echo/jsonp?callback=foo'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'foo({"echo":true,"callback":"foo"});');
                }
            },
            "and get custom jsonp": {
                topic: function() {
                    var self = this,
                        url = '/foo/bar/baz/echo/jsonp?callback=yo&foo=bar&baz=world';

                    fetch({
                        method: 'GET',
                        path: url
                    }, function(err, data) {
                        var q = parse(url);
                        var payload = qs.parse(q.query);
                        var callback = payload.callback;
                        delete payload.callback;
                        //payload.callback = callback;
                        data.expected = callback + '(' + JSON.stringify(payload) + ');';
                        self.callback(err, data);
                    });
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.headers['content-type'], 'application/json');
                    assert.equal(topic.body, topic.expected);
                }
            },
            "and post custom jsonp": {
                topic: function() {
                    var self = this,
                        url = '/foo/bar/baz/echo/jsonp?callback=yoyo&foo=bar&baz=world&do=not';

                    fetch({
                        method: 'POST',
                        path: url
                    }, function(err, data) {
                        var q = parse(url);
                        var payload = qs.parse(q.query);
                        var callback = payload.callback;
                        delete payload.callback;
                        data.expected = callback + '(' + JSON.stringify(payload) + ');';
                        self.callback(err, data);
                    });
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.headers['content-type'], 'application/json');
                    assert.equal(topic.body, topic.expected);
                }
            },
            "and post custom jsonp, express style": {
                topic: function() {
                    var self = this,
                        body = 'callback=yoyo&foo=bar&baz=world&do=not',
                        url = '/foo/bar/baz/echo/jsonp-express?' + body;

                    fetch({
                        method: 'POST',
                        path: url
                    }, function(err, data) {
                        var payload = qs.parse(body);
                        var callback = payload.callback;
                        delete payload.callback;
                        data.expected = callback + '(' + JSON.stringify(payload) + ');';
                        self.callback(err, data);
                    });
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.headers['content-type'], 'application/json');
                    assert.equal(topic.body, topic.expected);
                }
            },
            "and post custom jsonp, express style without callback": {
                topic: function() {
                    var body = 'foo=bar&baz=world&do=not',
                        url = '/foo/bar/baz/echo/jsonp-express?' + body;

                    fetch({
                        method: 'POST',
                        path: url
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 403);
                    assert.equal(topic.code, 403);
                    var b = JSON.parse(topic.body);
                    assert.equal(b.echo, 'error, no callback');
                }
            },
            "and delay 3 seconds": {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/delay/3'
                    }, this.callback);
                },
                "with query body": function(topic) {
                    assert.equal(topic.code, 200);
                    assert.equal(topic.body, 'waited for 3 seconds');
                }
            },
            'and delay by a range of seconds': {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/delay/1-3'
                    }, this.callback);
                },
                'with query body': function(res) {
                    var delay = res.body.match(/[\d.]+/);
                    delay = delay && parseFloat(delay);
                    assert(delay <= 3, 'delay should be less than 3 seconds');
                    assert(delay >= 1, 'delay should be more than 1 second');
                    assert.equal(res.code, 200);
                }
            },
            'and default to 0 for bad delay values': {
                topic: function() {
                    fetch({
                        method: 'GET',
                        path: '/foo/bar/baz/echo/delay/delay'
                    }, this.callback);
                },
                'with query body': function(res) {
                    assert.equal(res.code, 200);
                    assert.equal(res.body, 'waited for 0 seconds');
                }
            },
            'should be instantitable': {
                'should be different objects': {
                    topic: function() {
                        var one = new echoecho.EchoEcho({
                            paths: ['/one/one.html']
                        });
                        var two = new echoecho.EchoEcho({
                            paths: ['/two/one/', '/two/two/']
                        });

                        return [one, two]

                    },
                    'different paths': function(topic) {
                        assert.notDeepEqual(topic[0].BASE, topic[1].BASE);
                    }
                },
                'unknown queries with all option': {
                    'and use validator with object': {
                        topic: function() {
                            return new echoecho.EchoEcho({ all: true }).validate({
                                url: '/have/not/used/echo/status/500'
                            });
                        },
                        'should return "500"': function(topic) {
                            assert.equal(topic, '500');
                        }
                    },
                    'and use validator with string': {
                        topic: function() {
                            return new echoecho.EchoEcho({ all: true }).validate('/have/not/used/this/yet/echo/jsonp');
                        },
                        'should return "jsonp"': function(topic) {
                            assert.equal(topic, 'jsonp');
                        }
                    },
                    'and use validator with no echo': {
                        topic: function() {
                            return new echoecho.EchoEcho({ all: true }).validate('/have/not/used/this/yet/ech/jsonp');
                        },
                        'should return false': function(topic) {
                            assert.isFalse(topic);
                        }
                    }
                },
                'unknown queries without all option': {
                    'and use validator with object': {
                        topic: function() {
                            return new echoecho.EchoEcho().validate({
                                url: '/have/not/used/echo/status/500'
                            });
                        },
                        'should return false': function(topic) {
                            assert.isFalse(topic);
                        }
                    },
                    'and use validator with string': {
                        topic: function() {
                            return new echoecho.EchoEcho().validate('/have/not/used/this/yet/echo/jsonp');
                        },
                        'should return false': function(topic) {
                            assert.isFalse(topic);
                        }
                    }
                }
            }
        }
    }
};

Object.keys(http.STATUS_CODES).forEach(function(code) {
    var s = http.STATUS_CODES[code],
        c = Number(code, 10);
    if (c < 200) {
        return;
    }
    var test = {
        topic: function() {
            fetch({
                method: 'GET',
                path: '/foo/bar/baz/echo/status/' + code
            }, this.callback);
        }
    };
    test["with " + s + " body"] = function(topic) {
        assert.equal(topic.code, code);
        assert.equal(topic.body, s);
    };
    tests["should be loaded"]['and should load paths']["get status " + code] = test;
});



tests["should be loaded"]['and should load paths']["should load custom scheme"] = {

    topic: function() {
        this.count = Object.keys(echoecho.scheme);
        echoecho.load({
            'davglass': function(req, res) {
                res.writeHead(200, echoecho.scheme.headers);
                res.end('DAVGLASS WAS HERE');
            }
        });
        return echoecho;
    },
    "should have a new scheme": function() {
        assert.notEqual(this.count, Object.keys(echoecho.scheme));
        assert.equal(this.count.length + 1, Object.keys(echoecho.scheme).length);
    },
    "and should use new scheme": {
        topic: function() {
            fetch({
                method: 'GET',
                path: '/foo/bar/baz/echo/davglass'
            }, this.callback);
        },
        "custom scheme should respond": function(topic) {
            assert.equal(topic.body, 'DAVGLASS WAS HERE');
        }
    }

};

// -- Setup for general testing of routes -------------------------------------

var testRoutes = [{
        name: 'get',
        method: 'GET'
    }, {
        name: 'post',
        method: 'POST'
    }, {
        name: 'json',
        method: 'GET'
    }, {
        name: 'json',
        method: 'POST'
    }, {
        name: 'put',
        method: 'PUT'
    }, {
        name: 'delete',
        method: 'DELETE'
    }
];

// -- `response` query parameter tests ----------------------------------------

function assertResponseParam(route, method) {
    var json = '{"diaper":"huggies"}';
        path = '/foo/bar/baz/echo/' + route + '?response=' + json
        context = {
            topic: function() {
                fetch({
                    method: method,
                    path: path
                }, this.callback);
            }
        };

    context[route + ' route should use custom response'] = function (res) {
        assert.equal(res.body, json);
    }

    return context;
}

tests['should be loaded']
     ['and should load paths']
     ['and should use custom response (query)'] = {};

testRoutes.forEach(function (route) {
    tests['should be loaded']
         ['and should load paths']
         ['and should use custom response (query)']
         ['for route ' + route.name + ' with method ' + route.method]
            = assertResponseParam(route.name, route.method);
});

// -- `file` query parameter tests --------------------------------------------

var file = fs.readFileSync(__dirname + '/fixtures/file.json', 'utf8');

function assertFileParam(route, method) {
    var path = '/foo/bar/baz/echo/' + route + '?file=fixtures/file.json',
        context = {
            topic: function() {
                fetch({
                    method: method,
                    path: path
                }, this.callback);
            }
        };

    context[route + ' route should use custom response'] = function (res) {
        assert.equal(res.body, file);
    };

    return context;
}

tests['should be loaded']
     ['and should load paths']
     ['and should use custom response (file)'] = {};

testRoutes.forEach(function (route) {
    tests['should be loaded']
         ['and should load paths']
         ['and should use custom response (file)']
         ['for route ' + route.name + ' with method ' + route.method]
            = assertFileParam(route.name, route.method);
});

// -- delayable routes --------------------------------------------------------

function assertDelayedRoute(route, method) {
    var json = '{"megatron":"decepticon","optimus":"autobot"}',
        path = '/foo/bar/baz/echo/delay/1/' + route + '?response=' + json,
        context = {
            topic: function() {
                fetch({
                    method: method,
                    path: path
                }, this.callback);
            }
        };

    context[route + ' route should be delayed'] = function (res) {
        assert.equal(res.body, json);
    }

    return context;
}

tests['should be loaded']
     ['and should load paths']
     ['and routes should be delayable'] = {};

testRoutes.forEach(function (route) {
    tests['should be loaded']
         ['and should load paths']
         ['and routes should be delayable']
         ['for route ' + route.name + ' with method ' + route.method]
            = assertDelayedRoute(route.name, route.method);
});

// -- `type` query parameter tests --------------------------------------------

function assertContentType(route, method) {
    var path = '/foo/bar/baz/echo/' + route + '?type=css';
        context = {
            topic: function() {
                fetch({
                    method: method,
                    path: path
                }, this.callback);
            }
        };

    context[route + ' route should respond with specified content type'] = function (res) {
        assert.equal(res.headers['content-type'], 'text/css');
    }

    return context;
}

tests['should be loaded']
     ['and should load paths']
     ['and should respond with specified content type'] = {};

testRoutes.forEach(function (route) {
    tests['should be loaded']
         ['and should load paths']
         ['and should respond with specified content type']
         ['for route ' + route.name]
            = assertContentType(route.name, route.method);
});


vows.describe('echoecho').addBatch(tests).export(module);
