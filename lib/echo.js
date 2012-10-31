/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
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

var validate = function(req, lax) {
    if (typeof req === 'object') {
        req = req.url;
    }

    var url = req.split('?')[0],
        ret = false,
        route,
        base;

    Object.keys(BASE).forEach(function (b) {
        if (url.indexOf(b) === 0) {
            route = url.replace((b + '/echo/'), '');
            ret = true;
        }
    });
    
    //Catch all (non-registered) echo urls.
    if (!ret && url.indexOf('/echo/') > -1) {
        route = url.split('/echo/')[1];
        ret = true;
    }

    if (route && !lax) {
        ret = false;
        base = route.split('/');
        if (scheme[base[0]]) {
            ret = base[0];
            if (base[0] === 'status') {
                ret = base[1];
            }
        }
    }
    return ret;
};

exports.validate = validate;

var handle = function (req) {
    return !!validate(req, true);
};

exports.handle = handle;

var serve = function (req, res) {
    var base = validate(req);
    if (base && base !== true) {
        if (scheme[base]) {
            scheme[base](req, res);
        } else {
            scheme.status(base, res);
        }
    } else {
        scheme.status(404, res);
    }

};

exports.serve = serve;

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
