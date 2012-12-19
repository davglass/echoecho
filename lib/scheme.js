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

function mix(reciever, sender) {
    Object.keys(sender).forEach(function (key) {
        if (!reciever.hasOwnProperty(key)) {
            reciever[key] = sender[key];
        }
    });

    return reciever;
}

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

exports.get = function (req, res) {
    var p = parse(req.url),
        code = ((req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') ? 200 : 403);

    res.writeHead(code, headers);
    res.end(p.query || '');
};

exports['delete'] = function (req, res) {
    var p = parse(req.url),
        code = ((req.method === 'DELETE') ? 200 : 403);

    res.writeHead(code, headers);
    res.end(p.query || '');
};

var post = function (method, req, res) {
    var code = ((req.method === method) ? 200 : 403),
        data = '',
        gotData = false,
        sent = false,
        body = '',
        end = function () {
            if (!sent) {
                sent = true;
                var b = qs.parse(data);
                if (Object.keys(b).length > 0) {
                    body = data;
                } else {
                    body = String(Object.keys(b).length);
                }
                res.writeHead(code, headers);
                res.end(body);
            }
        };

    if (req.body) { //Express
        gotData = true;
        data = qs.stringify(req.body);
        end();
    } else {

        req.on('data', function (c) {
            gotData = true;
            data += c;
        });

        req.on('end', end);

        //Seems as if the post doesn't have data
        //the end event doesn't fire??
        setTimeout(function () {
            if (!gotData) {
                end();
            }
        }, 750);
    }
};

exports.post = function (req, res) {
    post('POST', req, res);
};

exports.put = function (req, res) {
    post('PUT', req, res);
};

exports.delay = function (req, res) {

    var delay = parseInt(req.url.split('/').pop(), 10),
        seconds = (delay * 1000);

    setTimeout(function () {
        res.writeHead(200, headers);
        res.end('waited for ' + delay + ' seconds');
    }, seconds);

};

exports.json = function (req, res) {
    var p = parse(req.url),
        json = (p.query ? JSON.stringify(qs.parse(p.query)) : '{ "echo": true }');

    if (req.body) {
        json = JSON.stringify(req.body);
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
