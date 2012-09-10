"use strict";

var path = require('path');
var parse = require('url').parse;
var qs = require('querystring');
var http = require('http');
var headers = {
    'Content-Type': 'text/plain'
};

exports.headers = headers;

exports.status = function (code, res) {
    var body = http.STATUS_CODES[code] || 'unknown';

    res.writeHead(code, 'HTTP/1.1 ' + body, headers);
    res.end(body);
};

exports.get = function (req, res) {
    var p = parse(req.url),
        code = ((req.method === 'GET' || req.method === 'HEAD') ? 200 : 403);

    res.writeHead(code, headers);
    res.end(p.query || '');
};

exports.delete = function (req, res) {
    var p = parse(req.url),
        code = ((req.method === 'DELETE') ? 200 : 403);

    res.writeHead(code, headers);
    res.end(p.query || '');
};

var post = function (method, req, res) {
    var p = parse(req.url),
        code = ((req.method === method) ? 200 : 403),
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
        data = qs.stringify(req.body);
    }

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
    }, 75);

};

exports.post = function (req, res) {
    post('POST', req, res);
};

exports.put = function (req, res) {
    post('PUT', req, res);
};

