"use strict";

var scheme = require('./scheme');
var parse = require('url').parse;
var path = require('path');
var BASE = {};

exports.scheme = scheme;

//Load more route listeners
var load = function (obj) {
    Object.keys(obj).forEach(function (key) {
        scheme[key] = obj[key];
    });
};

exports.load = load;


var serve = function (req, res) {
    var url = req.url.split('?')[0],
        route,
        base;

    Object.keys(BASE).forEach(function (b) {
        if (url.indexOf(b) === 0) {
            route = url.replace((b + '/echo/'), '');
        }
    });

    if (route) {
        base = route.split('/');
        if (base[0] === 'status') {
            scheme.status(base[1], res);
        } else if (scheme[base[0]]) {
            scheme[base[0]](req, res);
        } else {
            scheme.status(404, res);
        }
    } else {
        scheme.status(404, res);
    }

};

exports.serve = serve;

var handle = function (req) {
    var url = req.url.split('?')[0],
        ret = false;

    Object.keys(BASE).forEach(function (b) {
        if (url.indexOf(b) === 0) {
            ret = true;
        }
    });

    return ret;
};

exports.handle = handle;

var paths = function (p) {
    p.forEach(function (dir) {
        var base = dir;
        if (path.basename(dir).indexOf('.') > -1) {
            base = path.dirname(dir);
        }
        if (base.substr(-1) === '/') {
            base = base.substring(0, base.length - 1);
        }
        BASE[parse(base).path] = true;
    });
};

exports.BASE = BASE;

exports.paths = paths;
