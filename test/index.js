'use strict';

/*
 *   (c) Copyright 2016 Hewlett Packard Enterprise Development LP

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


/*global before*/
/*global after*/

var promise = require('bluebird');
var mockery = require('mockery');
var assert = require('chai').assert;

describe('ilorest', function () {
    var response, uri, statusCode;

    this.timeout(10000);

    function setResponse (res) {
        response = res;
    }

    function setUri (__uri) {
        uri = __uri;
    }

    function setStatusCode (__statusCode) {
        statusCode = __statusCode;
    }

    function getResponse () {
        return response;
    }

    function getUri () {
        return uri;
    }

    function getStatusCode () {
        return statusCode;
    }

    before(function (done) {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false,
            useCleanCache: true
        });

        mockery.registerMock('request-promise', function () {
            var res = {
                options: {
                    uri: getUri()
                },
                toJSON: function () {
                    return {
                        statusCode: getStatusCode(),
                        body: JSON.parse(getResponse())
                    };
                }
            };
            return promise.resolve(res);
        });
        
        done();
    });

    after(function (done) {
        mockery.disable();
        mockery.deregisterAll();
        done();
    });
    
    it('Initialize Rest client', function (done) {
        var ilorest = require('../lib');
        var client, v1Response = '{"@odata.context":"/redfish/v1/$metadata#ServiceRoot","@odata.id":"/redfish/v1/","Dummy": "This is root"}';
        var result;

        setResponse(v1Response);
        setUri('/rest/v1');
        setStatusCode(200);

        client = ilorest.restClient('http://10.10.10.10');
        client.getRootObject().then(function (res) {
            result = res.body;
        })
        .catch(function (res) {
            console.log(res);
        })
        .finally(function () {
            assert.equal(JSON.parse(v1Response).Dummy, result.Dummy);
            done();
        });
    });

    it('Initialize Redfish client', function (done) {
        var ilorest = require('../lib');
        var client, v1Response = '{"@odata.context":"/redfish/v1/$metadata#ServiceRoot","@odata.id":"/redfish/v1/","Dummy": "This is root"}';
        var result;

        setResponse(v1Response);
        setUri('/redfish/v1/');
        setStatusCode(200);

        client = ilorest.redfishClient('http://10.10.10.10');
        client.getRootObject().then(function (res) {
            result = res.body;
        })
        .catch(function (res) {
            console.log(res);
        })
        .finally(function () {
            assert.equal(JSON.parse(v1Response).Dummy, result.Dummy);
            done();
        });
    });

    it('Initialize Redfish client, error handling', function (done) {
        var ilorest = require('../lib');
        var client, v1Response = '{"@odata.context":"/redfish/v1/$metadata#ServiceRoot","@odata.id":"/redfish/v1/","Dummy": "This is root"}';

        setResponse(v1Response);
        setUri('/redfish/v1/');
        setStatusCode(500);

        client = ilorest.redfishClient('http://10.10.10.10');
        client.getRootObject().catch(function () {
        })
        .finally(function () {
            assert.equal(client.root, null);
            done();
        });
    });

});
