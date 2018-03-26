'use strict';
/*
 *   Copyright 2018 Hewlett Packard Enterprise Development LP

 *   Licensed under the Apache License, Version 2.0 (the "License"); you may
 *   not use this file except in compliance with the License. You may obtain
 *   a copy of the License at

 *        http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and limitations
 *   under the License.
 */

import { _p, baseClient, authMethod } from './base';
import gzip from 'zlib';

// lazy load C++ addon, in case we want this to work in browserify
var callRest, parsers, freeParser;

/**
 * CHIF client class
 * @extends baseClient
 */
class blobClient extends baseClient {
    /**
     * This class instance is initiated by helper function {@link restClient} or {@link redfishClient}
     */
    constructor(
        baseUrl,
        userName = '',
        password = '',
        biosPassword = null,
        sessionKey = null,
        defaultPrefix = '/rest/v1',
        timeout = 60,
        concurrent = 5,
        cacheOptions = null,
        isRedfish = false,
        proxy = null
    ) {
        super(
            baseUrl,
            userName,
            password,
            biosPassword,
            sessionKey,
            defaultPrefix,
            timeout,
            concurrent,
            cacheOptions,
            proxy
        );

        parsers = require('_http_common').parsers;
        freeParser = require('_http_common').freeParser;
        callRest = require('../../build/Release/addon').callRest;
        this.http_vsn_str = 'HTTP/1.1';
        this.isRedfish = isRedfish;
    }

    __getReqHeaders(headers, providerHeader) {
        headers = super.__getReqHeaders(headers, providerHeader);
        if (this.isRedfish) {
            headers['OData-Version'] = '4.0';
        }
        return headers;
    }
    __formOptions(
        path,
        method = 'GET',
        args = null,
        body = null,
        headers = null,
        timeout = null,
        optionalPassword = null,
        providerHeader = null
    ) {
        if (
            !this.isRedfish &&
            path &&
            path.indexOf(this.defaultPrefix) >= 0 &&
            path.charAt(path.length - 1) === '/'
        ) {
            path = path.slice(0, path.length - 1);
        } else if (
            this.isRedfish &&
            path &&
            path.indexOf(this.defaultPrefix) >= 0 &&
            path.charAt(path.length - 1) !== '/'
        ) {
            path = path + '/';
        }
        return super.__formOptions(
            path,
            method,
            args,
            body,
            headers,
            timeout,
            optionalPassword,
            providerHeader
        );
    }

    __sendRequest(options, resolvePromise) {
        var headers = options.headers || {};
        var requestPath = options.uri;
        var timeout = options.timeout;
        var packetString;
        var bodyBuffer;
        var reqBuffer;

        var HTTPParser = process.binding('http_parser').HTTPParser;
        var parser = parsers.alloc();
        var originalMessageComplete = parser[HTTPParser.kOnMessageComplete];
        var cResponse;

        if (options.qs && options.method === 'GET') {
            let queryString = [];
            Object.entries(options.qs).forEach(([key, value]) => {
                queryString.push(
                    encodeURIComponent(key) + '=' + encodeURIComponent(value)
                );
            });
            requestPath = requestPath + '?' + queryString.join('&');
        }

        if (options.body != undefined || options.body != null) {
            let contentType = 'application/json';
            if (Buffer.isBuffer(options.body)) {
                bodyBuffer = options.body;
            } else {
                let bodyString;
                try {
                    bodyString = JSON.stringify(options.body);
                } catch (e) {
                    bodyString = options.body.toString();
                    contentType = 'application/x-www-form-urlencoded';
                }
                bodyBuffer = Buffer.from(bodyString);
            }
            headers['Content-Length'] = bodyBuffer.length;
            headers['Content-Type'] = contentType;
        }

        packetString = `${options.method} ${requestPath} ${
            this.http_vsn_str
        }\r\nHost:\r\nAccept-Encoding: identity\r\n`;

        for (let [key, value] of Object.entries(headers)) {
            packetString += `${key}: ${value}\r\n`;
        }
        packetString += '\r\n';
        packetString = Buffer.from(packetString);

        if (bodyBuffer) {
            reqBuffer = Buffer.concat(
                [packetString, bodyBuffer],
                packetString.length + bodyBuffer.length
            );
        } else {
            reqBuffer = packetString;
        }

        function parse(buffer) {
            if (buffer.length > 0) {
                parser.execute(buffer, 0, buffer.length);
            } else {
                resolvePromise({
                    statusCode: 500,
                    headers: {},
                    body: {
                        error: 'Error from iLO channel',
                    },
                });
            }
        }

        function processResponse(res) {
            var buf = Buffer.concat(res.buffer, res.length);
            var finalResponse = '';
            var jsonRes;

            try {
                if (
                    res.statusCode >= 200 &&
                    res.statusCode < 300 &&
                    res.headers['content-encoding'] === 'gzip' &&
                    buf.length > 0
                ) {
                    let unzipBuf = gzip.gunzipSync(buf);
                    finalResponse = unzipBuf.toString();
                } else {
                    finalResponse = buf.toString();
                }
                jsonRes = JSON.parse(finalResponse);
            } catch (err) {
                jsonRes = '';
            }
            parser.finish();
            freeParser(parser);
            resolvePromise({
                statusCode: res.statusCode,
                headers: res.headers,
                body: jsonRes,
            });
        }

        parser.reinitialize(HTTPParser.RESPONSE);
        parser.onIncoming = function(res) {
            var buffers = [];
            var bufferLength = 0;
            res.on('data', function(chunk) {
                if (chunk.length) {
                    bufferLength += chunk.length;
                    buffers.push(chunk);
                }
            });
            res.on('end', function() {
                processResponse({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    buffer: buffers,
                    length: bufferLength,
                });
            });
        };
        // TODO: Call C library here, mock the response here
        callRest(reqBuffer, reqBuffer.length, timeout, parse);
    }

    login(userName = '', password = '', auth = authMethod.SESSION) {
        return this.getRootObject()
            .then(res => {
                this.root = res.body;
                this.loginUrl = this.isRedfish
                    ? this.root.Links.Sessions['@odata.id']
                    : this.root.links.Sessions.href;
            })
            .then(() => this.__doLogin(userName, password, auth));
    }
}

export { blobClient };
