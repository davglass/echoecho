/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
"use strict";

var parse = require('url').parse;
var path  = require('path');
var fs    = require('fs');
var qs    = require('querystring');

/*

EchoEcho({
    paths: [] //Array of paths
    all: true //Turn on all paths with 'echo' in the url
})

*/

var EchoEcho = function(options) {
    this.BASE = {};
    this.options = options || {};

    this.scheme = require('./scheme');

    if (this.options.paths && !this.options.all) {
        this.paths(this.options.paths);
    }
};

EchoEcho.prototype = {
    load: function (obj) {
        var self = this;
        Object.keys(obj).forEach(function (key) {
            self.scheme[key] = obj[key];
        });
    },
    validate: function(req, lax) {
        if (typeof req === 'object') {
            req = req.url;
        }

        var url = req.split('?')[0],
            ret = false,
            route,
            base;

        if (this.options.all) {
            //Catch all (non-registered) echo urls.
            if (!ret && url.indexOf('/echo/') > -1) {
                route = url.split('/echo/')[1];
                ret = true;
            }
        } else {
            Object.keys(this.BASE).forEach(function (b) {
                if (url.indexOf(b) === 0) {
                    route = url.replace((b + '/echo/'), '');
                    ret = true;
                }
            });
        }

        if (route && !lax) {
            ret = false;
            base = route.split('/');
            if (this.scheme[base[0]]) {
                ret = base[0];
                if (base[0] === 'status') {
                    ret = base[1];
                }
            }
        }
        return ret;
    },
    handle: function (req) {
        return !!this.validate(req, true);
    },
    serve: function (req, res, config) {
        var self = this,
            base = this.validate(req),
            filepath,
            parsed,
            query,
            data,
            dirroot = __dirname;

        config = config || {};

        if (config.dirroot) {
            dirroot = config.dirroot;
        }

        if (base && base !== true) {
            if (this.scheme[base]) {
                query  = parse(req.url).query;
                parsed = qs.parse(query);

                if (parsed.response) {
                    this.scheme[base](req, res, parsed.response);
                } else if (parsed.file) {
                    filepath = path.join(dirroot, parsed.file);
                    fs.readFile(filepath, function (err, data) {
                        /*istanbul ignore next*/
                        if (err) {
                            self.scheme.status(404, res);
                        }
                        self.scheme[base](req, res, data);
                    });
                } else {
                    this.scheme[base](req, res, data);
                }
            } else {
                this.scheme.status(base, res);
            }
        } else {
            this.scheme.status(404, res);
        }

    },
    paths: function (p) {
        p.forEach(function (dir) {
            var base = dir;
            if (path.basename(dir).indexOf('.') > -1) {
                base = path.dirname(dir);
            }
            if (base.substr(-1) === '/') {
                base = base.substring(0, base.length - 1);
            }
            this.BASE[parse(base).path] = true;
        }, this);
    }
};

module.exports = new EchoEcho();

module.exports.EchoEcho = EchoEcho;
