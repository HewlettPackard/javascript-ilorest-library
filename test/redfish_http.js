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

var promise = require('bluebird');
var mockery = require('mockery');
var assert = require('chai').assert;

describe('redfish_http', function () {
    var response, uri, statusCode, headers;

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

    function setHeaders (__headers) {
        headers = __headers;
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

    function getHeaders () {
        return headers;
    }

    before(async function() {
        await mockery.registerMock('request-promise', () => {
            var res = {
                options: {
                    uri: getUri()
                },
                toJSON: function () {
                    return {
                        statusCode: getStatusCode(),
                        body: JSON.parse(getResponse()),
                        headers: JSON.parse(getHeaders())
                    };
                }
            };
            return promise.resolve(res);
        });
    });

    after(async function() {
        await mockery.deregisterAll();
    });
    
    it('Initialize Rest client', async function() {
        var ilorest = require('../lib');
        var client, v1Response = '{"@odata.context":"/redfish/v1/$metadata#ServiceRoot","@odata.id":"/redfish/v1/","Dummy": "This is root"}';
        var headers = '{"allow":"GET,HEAD","cache-control":"no-cache","connection":"keep-alive","content-length":"1552","content-type":"application/json; charset=utf-8","date":"Sun, 07 Aug 2016 06:52:31 GMT","link":"</redfish/v1/SchemaStore/en/ServiceRoot.json/>; rel=describedby","odata-version":"4.0","server":"HPE-iLO-Server/1.30","x-frame-options":"sameorigin","x_hp-chrp-service-version":"1.0.3"}';

        setResponse(v1Response);
        setUri('/rest/v1');
        setStatusCode(200);
		setHeaders(headers);

        client = ilorest.restClient('http://10.10.10.10');
        var res = await client.getRootObject();
        
        assert.equal(JSON.parse(v1Response).Dummy, res.body.Dummy);
    });

    it('Initialize Redfish client', async function() {
        var ilorest = require('../lib');
        var client, v1Response = '{"@odata.context":"/redfish/v1/$metadata#ServiceRoot","@odata.id":"/redfish/v1/","Dummy": "This is root"}';
        var headers = '{"allow":"GET,HEAD","cache-control":"no-cache","connection":"keep-alive","content-length":"1552","content-type":"application/json; charset=utf-8","date":"Sun, 07 Aug 2016 06:52:31 GMT","link":"</redfish/v1/SchemaStore/en/ServiceRoot.json/>; rel=describedby","odata-version":"4.0","server":"HPE-iLO-Server/1.30","x-frame-options":"sameorigin","x_hp-chrp-service-version":"1.0.3"}';
    
        setResponse(v1Response);
        setUri('/redfish/v1/');
        setStatusCode(200);
		setHeaders(headers);
    
        client = ilorest.redfishClient('http://10.10.10.10');
        var res = await client.getRootObject();
        
        assert.equal(JSON.parse(v1Response).Dummy, res.body.Dummy);
    });
    
    it('Initialize Redfish client, error handling', async function() {
        var ilorest = require('../lib');
        var client, v1Response = '{"@odata.context":"/redfish/v1/$metadata#ServiceRoot","@odata.id":"/redfish/v1/","Dummy": "This is root"}';
        var headers = '{"allow":"GET,HEAD","cache-control":"no-cache","connection":"keep-alive","content-length":"1552","content-type":"application/json; charset=utf-8","date":"Sun, 07 Aug 2016 06:52:31 GMT","link":"</redfish/v1/SchemaStore/en/ServiceRoot.json/>; rel=describedby","odata-version":"4.0","server":"HPE-iLO-Server/1.30","x-frame-options":"sameorigin","x_hp-chrp-service-version":"1.0.3"}';
    
        setResponse(v1Response);
        setUri('/redfish/v1/');
        setStatusCode(500);
		setHeaders(headers);
    
        client = ilorest.redfishClient('http://10.10.10.10');
        try {
            await client.getRootObject();
        }
        catch(e) {
            // do nothing
        }
        
        assert.equal(client.root, null);
    });
    
    it('Login Redfish client', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hp":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"}}';
        var headers = '{ "cache-control": "no-cache","connection": "keep-alive","content-length": "163","content-type": "application/json; charset=utf-8","date": "Sun, 07 Aug 2016 03:21:32 GMT","link": "</redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/>; rel=self","location": "https://15.119.209.105/redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/","odata-version": "4.0","server": "HPE-iLO-Server/1.30","x-auth-token": "43ca8d6e93445cf6f7750104c5eb4541","x-frame-options": "sameorigin","x_hp-chrp-service-version": "1.0.3" }';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10');
        await client.login(USER, PASS);
        
        assert.equal(JSON.parse(headers)['x-auth-token'], client.getSessionKey());
    });
    
    it('Login Redfish client with BASIC authorize method', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hp":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"}}';
        var headers = '{ "cache-control": "no-cache","connection": "keep-alive","content-length": "163","content-type": "application/json; charset=utf-8","date": "Sun, 07 Aug 2016 03:21:32 GMT","link": "</redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/>; rel=self","location": "https://15.119.209.105/redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/","odata-version": "4.0","server": "HPE-iLO-Server/1.30","x-auth-token": "43ca8d6e93445cf6f7750104c5eb4541","x-frame-options": "sameorigin","x_hp-chrp-service-version": "1.0.3" }';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10');
        await client.login(USER, PASS, ilorest.authMethod.BASIC);
        
        assert.equal('Basic ' + (new Buffer((USER + ':' + PASS)).toString('base64')), client.getAuthorizationKey());
    });
    
    it('Login Redfish client with no matching authorize method', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hp":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"}}';
        var headers = '{ "cache-control": "no-cache","connection": "keep-alive","content-length": "163","content-type": "application/json; charset=utf-8","date": "Sun, 07 Aug 2016 03:21:32 GMT","link": "</redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/>; rel=self","location": "https://15.119.209.105/redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/","odata-version": "4.0","server": "HPE-iLO-Server/1.30","x-auth-token": "43ca8d6e93445cf6f7750104c5eb4541","x-frame-options": "sameorigin","x_hp-chrp-service-version": "1.0.3" }';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10');
        try {
            await client.login(USER, PASS, '');
        }
        catch(e) {
            // do nothing
        }

        assert.equal(null, client.getSessionKey());
        assert.equal(null, client.getAuthorizationKey());
    });
    
    it('Logout Redfish client', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hp":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"}}';
        var headers = '{ "cache-control": "no-cache","connection": "keep-alive","content-length": "163","content-type": "application/json; charset=utf-8","date": "Sun, 07 Aug 2016 03:21:32 GMT","link": "</redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/>; rel=self","location": "https://15.119.209.105/redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/","odata-version": "4.0","server": "HPE-iLO-Server/1.30","x-auth-token": "43ca8d6e93445cf6f7750104c5eb4541","x-frame-options": "sameorigin","x_hp-chrp-service-version": "1.0.3" }';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10');
        await client.login(USER, PASS);
        await client.logout();
        
        assert.equal(null, client.getSessionKey());
        assert.equal(null, client.getSessionLocation());
        assert.equal(null, client.getAuthorizationKey());
    });
    
    it('Logout Redfish client, error handling', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hp":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"}}';
        var headers = '{ "cache-control": "no-cache","connection": "keep-alive","content-length": "163","content-type": "application/json; charset=utf-8","date": "Sun, 07 Aug 2016 03:21:32 GMT","link": "</redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/>; rel=self","location": "https://15.119.209.105/redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/","odata-version": "4.0","server": "HPE-iLO-Server/1.30","x-auth-token": "43ca8d6e93445cf6f7750104c5eb4541","x-frame-options": "sameorigin","x_hp-chrp-service-version": "1.0.3" }';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10');
        await client.login(USER, PASS);
        
        setStatusCode(201);
        try {
            await client.logout();
        }
        catch(e) {
            // do nothing
        }
        
        assert.equal(JSON.parse(headers)['x-auth-token'], client.getSessionKey());
    });
    
    it('Get resource directory from local cache', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hpe":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"},"Dummy":"Correct"}';
        var headers = '{ "cache-control": "no-cache","connection": "keep-alive","content-length": "163","content-type": "application/json; charset=utf-8","date": "Sun, 07 Aug 2016 03:21:32 GMT","link": "</redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/>; rel=self","location": "https://15.119.209.105/redfish/v1/SessionService/Sessions/username57a6a93cd0e56041/","odata-version": "4.0","server": "HPE-iLO-Server/1.30","x-auth-token": "43ca8d6e93445cf6f7750104c5eb4541","x-frame-options": "sameorigin","x_hp-chrp-service-version": "1.0.3" }';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10');
        await client.login(USER, PASS);
        var rdUrl = client.root.Oem.Hpe.Links.ResourceDirectory['@odata.id'];
        var res = await client.get(rdUrl, null, true);
        
        assert.equal(JSON.parse(response).Dummy, res.body.Dummy);
    });
    
    it('Update RBSU', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password', BPASS = 'PA55WORD';
        var response = '{"@odata.id":"/redfish/v1/","AccountService":{"@odata.id":"/redfish/v1/AccountService/"},"Links":{"Sessions":{"@odata.id":"/redfish/v1/SessionService/Sessions/"}},"Managers":{"@odata.id":"/redfish/v1/Managers/"},"Oem":{"Hp":{"Links":{"ResourceDirectory":{"@odata.id":"/redfish/v1/ResourceDirectory/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"SessionService":{"@odata.id":"/redfish/v1/SessionService/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"}}';
        var headers = '{"allow":"GET,HEAD","cache-control":"no-cache","connection":"keep-alive","content-length":"1552","content-type":"application/json; charset=utf-8","date":"Sun, 07 Aug 2016 06:52:31 GMT","link":"</redfish/v1/SchemaStore/en/ServiceRoot.json/>; rel=describedby","odata-version":"4.0","server":"HPE-iLO-Server/1.30","x-frame-options":"sameorigin","x_hp-chrp-service-version":"1.0.3"}';
		var rbsuRes = '{"@odata.id":"/redfish/v1/Registries/","Members":[{"@odata.id":"/redfish/v1/Systems/1/"},{"@odata.id":"/redfish/v1/Registries/Base/"},{"@odata.id":"/redfish/v1/Registries/HpCommon/"},{"@odata.id":"/redfish/v1/Registries/iLO/"},{"@odata.id":"/redfish/v1/Registries/iLOEvents/"},{"@odata.id":"/redfish/v1/Registries/HpBiosAttributeRegistryU22.1.0.70/"}],"links":{"Member":[{"href":"/redfish/v1/Systems/1/"}],"self":{"href":"/redfish/v1/Systems/"},"Settings":{"href":"/rest/v1/systems/1/bios/Settings"}},"Oem":{"Hp":{"Manager":[{"ManagerType":"iLO 4"}],"Links":{"BIOS":{"@odata.id":"/redfish/v1/systems/1/bios/"}}}},"Registries":{"@odata.id":"/redfish/v1/Registries/"},"Systems":{"@odata.id":"/redfish/v1/Systems/"},"AttributeRegistry":"HpBiosAttributeRegistryU22.1.0.70","Location":[{"Language":"en","Uri":{"extref":"/redfish/v1/registrystore/registries/en/hpbiosattributeregistryu22.1.0.70/"}},{"Language":"ja","Uri":{"extref":"/redfish/v1/registrystore/registries/ja/hpbiosattributeregistryu22.1.0.70/"}},{"Language":"zh","Uri":{"extref":"/redfish/v1/registrystore/registries/zh/hpbiosattributeregistryu22.1.0.70/"}}],"RegistryEntries":{"Attributes":[{"Name":"TimeFormat","CurrentValue":"Local"}],"Dependencies":[{"DependencyFor":"TimeFormat","Type":"Map","Dependency":{"MapFrom":[{"MapFromAttribute":"TimeFormat","MapFromProperty":"CurrentValue","MapFromCondition":"==","MapFromValue":"Local"}],"MapToAttribute":"TimeZone","MapToProperty":"CurrentValue","MapToValue":"Unspecified"}}],"Menus":[{"Name":"TimeZone","CurrentValue":"Unspecified"}]},"Dummy":"Correct"}';
    
        setUri('/redfish/v1/');
        setResponse(response);
        setStatusCode(200);
        setHeaders(headers);
    
        var client = ilorest.redfishClient('http://10.10.10.10', USER, PASS, BPASS);
		var ris = ilorest.ris();
		var rbsu = ris.rbsu(client);
        
        await client.login(USER, PASS);
        setResponse(rbsuRes);
        var currentRBSU = (await rbsu.getRBSUdata())[0];
        var rbsuOption = (await rbsu.getRegistryOption(currentRBSU))[0];
        var registry = await rbsu.getRegistryContent(rbsuOption);
        var nextRBSU = await rbsu.getNextSetting(currentRBSU);
        nextRBSU.Attributes.AdminPhone = '857-5309';
        var res = await rbsu.updateRBSU(registry, currentRBSU, nextRBSU);
        
        assert.equal(JSON.parse(rbsuRes).Dummy, res.body.Dummy);
    });

});
