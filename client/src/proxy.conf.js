/*
 * *****************************************************************************
 * Copyright (C) 2019-2024 Chrystian Huot <chrystian@huot.qc.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 * ****************************************************************************
 */

'use strict';

// Default target: a server running alongside the dev server. To point at another
// machine, drop a proxy.conf.local.js next to this file — it is gitignored:
//
//     module.exports = { server: 'http://192.168.1.226:3000' };
//
// Use an IPv4 literal there, not a .local name: Node resolves mDNS hostnames to
// unroutable IPv6 addresses first and proxying dies with EHOSTUNREACH. curl
// hides this by falling back to IPv4; Node doesn't.
let server = 'http://localhost:3000';

try {
    server = require('./proxy.conf.local.js').server || server;
} catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
}

module.exports = [
    {
        context: ['/**', '!/admin**', '!/ng-cli-ws**', '!/reset**'],
        secure: false,
        target: server,
        ws: true
    }
]