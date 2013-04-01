/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
"use strict";

var parse = require('url').parse;
var qs = require('querystring');
var http = require('http');
var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/plain'
};

var RE_DELAY_RANGE = /(\d+)-(\d+)/;

function mix(reciever, sender) {
    Object.keys(sender).forEach(function (key) {
        if (!reciever.hasOwnProperty(key)) {
            reciever[key] = sender[key];
        }
    });

    return reciever;
}

var rand = exports.rand = function (min, max) {
    return Math.random() * (max - min) + min;
};

exports.headers = headers;

exports.status = function (code, res) {
    var body = http.STATUS_CODES[code];

    if (!body) {
        code = 500;
        body = 'Unknown Echo Status';
    }

    res.writeHead(code, 'HTTP/1.1 ' + body, headers);
    res.end(body);
};

exports.get = function (req, res, body) {
    var code = ((req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') ? 200 : 403);

    res.writeHead(code, headers);
    res.end(body || parse(req.url).query || '');
};

exports['delete'] = function (req, res, body) {
    var code = ((req.method === 'DELETE') ? 200 : 403);

    res.writeHead(code, headers);
    res.end(body || parse(req.url).query || '');
};

var post = function (method, req, res, body) {
    var data    = '',
        gotData = false,
        sent    = false;

    function end() {
        if (sent) { return; }

        var code;

        if (!body) {
            body = Object.keys(qs.parse(data)).length > 0 ? data : '';
        }

        if (req.method === method) {
            code = body ? 200 : 204;
        } else {
            code = 403;
        }

        sent = true;

        res.writeHead(code, headers);
        res.end(body);
    }

    // Check if we have data, and aid Express' `req` object.
    if (body) {
        end();
    } else if (req.body && Object.keys(req.body).length) {
        data    = qs.stringify(req.body);
        gotData = true;

        end();

    } else {

        req.on('data', function (c) {
            data += c;
            gotData = true;
        });

        req.on('end', end);

        // Seems as if the post doesn't have data the end event doesn't fire??
        setTimeout(function () {
            if (!gotData) {
                end();
            }
        }, 750);
    }
};

exports.post = function (req, res, body) {
    post('POST', req, res, body);
};

exports.put = function (req, res, body) {
    post('PUT', req, res, body);
};

exports.delay = function (req, res, body) {
    var path    = parse(req.url).pathname,
        parts   = path.split('/delay/')[1].split('/'),
        delay   = parts[0],
        scheme  = parts[1],
        range   = delay.match(RE_DELAY_RANGE),
        seconds;

    if (range) {
        seconds = rand(parseInt(range[1], 10), parseInt(range[2], 10));
    } else {
        seconds = parseInt(delay, 10) || 0;
    }

    setTimeout(function () {
        if (scheme && exports[scheme]) {
            exports[scheme](req, res, body);
        } else {
            res.writeHead(200, headers);
            res.end('waited for ' + seconds + ' seconds');
        }
    }, seconds * 1000);
};

exports.json = function (req, res, body) {
    var json = body;

    if (json) {
        // Validate.
        try {
            JSON.parse(json);
        } catch (ex) {
            return exports.status(400, res);
        }
    } else if (req.body && Object.keys(req.body).length) {
        json = JSON.stringify(req.body);
    } else if (parse(req.url).query) {
        json = JSON.stringify(qs.parse(parse(req.url).query));
    } else {
        json = '{ "echo": true }';
    }

    res.writeHead(200, mix({
        'Content-Type': 'application/json'
    }, headers));
    res.end(json);
};

exports.jsonp = function (req, res) {
    var p = parse(req.url),
        code = 200,
        callback = '',
        query = qs.parse(p.query),
        content = { "echo": true },
        json = '';

    if (query.callback) {
        callback = query.callback;
        delete query.callback;
        content.callback = callback;
    }

    if (req.body) {
        query = req.body;
        if (query.callback) {
            callback = query.callback;
            delete query.callback;
        }
    }

    if (Object.keys(query).length) {
        content = query;
    }


    if (!callback) {
        code = 403;
        json = JSON.stringify({ "echo": "error, no callback" });
    } else {
        json = callback + '(' + JSON.stringify(content) + ');';
    }

    res.writeHead(code, mix({
        'Content-Type': 'application/json'
    }, headers));
    res.end(json);
};
