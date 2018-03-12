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
 
var fs = require('fs');
var mockery = require('mockery');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

describe('redfish_blob', function() {
    function MockProvider() {
        var defaultStrategy = new OriginRestStrategy();
        var currentStrategy = defaultStrategy;
        return {
            set strategy(value) {
                currentStrategy = value;
            },
            reset: () => {
                currentStrategy = defaultStrategy;
            },
            callRest: (buffer, length, timeout, callback) => {
                currentStrategy.callRest(buffer, length, timeout, callback);
            }
        };
    }
    
    class OriginRestStrategy {
        constructor() {
            this.originRest = require('../build/Release/addon');
        }
        
        callRest(buffer, length, timeout, callback) {
            this.originRest.callRest(buffer, length, timeout, callback);
        }
    }
    
    // class DumpRestStrategy extends OriginRestStrategy {
    //     constructor(savename) {
    //         super();
    //         this.savename = savename;
    //         this.count = 0;
    //     }
    // 
    //     callRest(buffer, length, timeout, callback) {
    //         super.callRest(buffer, length, timeout, (result) => {
    //             fs.open('test/dump/' + this.savename + '_request' + this.count, 'w+', (err, fd) => {
    //                 fs.writeFile(fd, buffer, _ => _);
    //             });
    //             fs.open('test/dump/' + this.savename + '_response' + this.count, 'w+', (err, fd) => {
    //                 fs.writeFile(fd, result, _ => _);
    //             });
    // 
    //             this.count++;
    //             callback(result);
    //         });
    //     }
    // }
    
    function ParseHeaderSimple(buffer) {
        var result = buffer.toString().split(' ').slice(0, 2);
        return {
            method: result[0].toUpperCase(),
            url: result[1]
        }
    }
    
    class FromFileStrategy {
        constructor(folder, map) {
            this.folder = folder;
            this.map = map;
        }
        
        callRest(buffer, length, timeout, callback) {
            var header = ParseHeaderSimple(buffer);
            var filename = this.map[header.url][header.method];
            fs.readFile('test/mock_data/redfish/' + this.folder + '/' + filename, (err, result) => {
                if (err) {
                    console.log(err);
                    throw err;
                }
                callback(result);
            });
        }
    }
    
    class EmptyStrategy {
        callRest(buffer, length, timeout, callback) {
            callback([]);
        }
    }
    
    /////////////////////////////////////////////////////////
    
    var mockProvider = new MockProvider();
    this.timeout(10000);
    
    before(async function() {
        await mockery.registerMock('../../build/Release/addon', mockProvider);
    });
    
    beforeEach(async function() {
        await mockProvider.reset();
    })
    
    after(async function() {
        await mockery.deregisterAll();
    });
    
    it('Initialize Redfish client', async function() {
        var ilorest = require('../lib');
        var client = ilorest.redfishClient('blobstore://');
        
        mockProvider.strategy = new FromFileStrategy('init', {
            '/redfish/v1/': { 'GET': 'root_response' }
        });
        // mockProvider.strategy = new DumpRestStrategy('root');
        
        var res = await client.getRootObject();
        
        assert.equal('/redfish/v1/', res.body['@odata.id']);
    });
    
    it('Initialize Redfish client, error handling', async function() {
        var ilorest = require('../lib');
        var client = ilorest.redfishClient('blobstore://');
        var err = null;
        
        mockProvider.strategy = new EmptyStrategy();
        
        try {
            err = null;
            await client.getRootObject();
        }
        catch(e) {
            err = e;
        }
        expect(err).to.not.be.null;
        
        mockProvider.strategy = new FromFileStrategy('init', {
            '/redfish/v1/': { 'GET': 'rootfail_response' }
        });
        
        try {
            err = null;
            await client.getRootObject();
        }
        catch(e) {
            err = e;
        }
        expect(err).to.not.be.null;
    });
    
    it('Login Redfish client', async function () {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var client = ilorest.redfishClient('blobstore://');
        
        mockProvider.strategy = new FromFileStrategy('login', {
            '/redfish/v1/': { 'GET': 'root_response' },
            '/redfish/v1/SessionService/Sessions/': { 'POST': 'login_response' }
        });
        // mockProvider.strategy = new DumpRestStrategy('login');
        
        await client.login(USER, PASS);
        
        assert.equal('aa9e9965c1110450fcbf89b5f819b347', client.getSessionKey());
    });
    
    it('Login Redfish client with BASIC authorize method', async function () {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var client = ilorest.redfishClient('blobstore://');
    
        mockProvider.strategy = new FromFileStrategy('login_basic_auth', {
            '/redfish/v1/': { 'GET': 'root_response' },
            '/redfish/v1/SessionService/Sessions/': { 'GET': 'login_response' }
        });
        // mockProvider.strategy = new DumpRestStrategy('basic');
        
        await client.login(USER, PASS, ilorest.authMethod.BASIC);
        
        assert.equal('Basic ' + (new Buffer((USER + ':' + PASS)).toString('base64')), client.getAuthorizationKey());
    });
    
    it('Login Redfish client with no matching authorize method', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var client = ilorest.redfishClient('blobstore://');
        
        mockProvider.strategy = new FromFileStrategy('login', {
            '/redfish/v1/': { 'GET': 'root_response' }
        });
        
        try {
            await client.login(USER, PASS, '');
        }
        catch(e) {
            // do nothing
        }

        assert.equal(null, client.getSessionKey());
        assert.equal(null, client.getAuthorizationKey());
    });
    
    it('Logout Redfish client', async function () {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var client = ilorest.redfishClient('blobstore://');
    
        mockProvider.strategy = new FromFileStrategy('logout', {
            '/redfish/v1/': { 'GET': 'root_response' },
            '/redfish/v1/SessionService/Sessions/': { 'POST': 'login_response' },
            '/redfish/v1/SessionService/Sessions/username000000005aa0f010d645a1ca/': { 'DELETE': 'logout_response' }
        });
        // mockProvider.strategy = new DumpRestStrategy('logout');
        
        await client.login(USER, PASS);
        await client.logout();
        
        assert.equal(null, client.getSessionKey());
        assert.equal(null, client.getSessionLocation());
        assert.equal(null, client.getAuthorizationKey());
    });
    
    it('Logout Redfish client, error handling', async function() {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var client = ilorest.redfishClient('blobstore://');
        
        mockProvider.strategy = new FromFileStrategy('logout', {
            '/redfish/v1/': { 'GET': 'root_response' },
            '/redfish/v1/SessionService/Sessions/': { 'POST': 'login_response' },
            '/redfish/v1/SessionService/Sessions/username000000005aa0f010d645a1ca/': { 'DELETE': 'logoutfail_response' }
        });
        
        await client.login(USER, PASS);
        try {
            await client.logout();
        }
        catch(e) {
            // do nothing
        }
        
        assert.equal('d982d3085dd2bd36ae92eb5e2ce3183f', client.getSessionKey());
    });
    
    it('Get resource directory from local cache', async function () {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password';
        var client = ilorest.redfishClient('blobstore://');
    
        mockProvider.strategy = new FromFileStrategy('resource_local', {
            '/redfish/v1/': { 'GET': 'root_response' },
            '/redfish/v1/SessionService/Sessions/': { 'POST': 'login_response' },
            '/redfish/v1/ResourceDirectory/': { 'GET': 'directory_response' }
        });
        // mockProvider.strategy = new DumpRestStrategy('resource');
        
        await client.login(USER, PASS);
        var rdUrl = client.root.Oem.Hpe.Links.ResourceDirectory['@odata.id'];
        var res = await client.get(rdUrl, null, true);
        
        assert.equal('/redfish/v1/ResourceDirectory/', res.body['@odata.id']);
    });
    
    it('Update RBSU', async function () {
        var ilorest = require('../lib');
        var USER = 'username', PASS = 'password', BPASS = 'PA55WORD';
        var client = ilorest.redfishClient('blobstore://', USER, PASS, BPASS);
		var ris = ilorest.ris();
		var rbsu = ris.rbsu(client);
    
        mockProvider.strategy = new FromFileStrategy('rbsu', {
            '/redfish/v1/': { 'GET': 'root_response' },
            '/redfish/v1/SessionService/Sessions/': { 'POST': 'login_response' },
            '/redfish/v1/Systems/': { 'GET': 'systems_response' },
            '/redfish/v1/Systems/1/': { 'GET': 'systems_1_response' },
            '/redfish/v1/systems/1/bios/': { 'GET': 'bios_response' },
            '/redfish/v1/Registries/': { 'GET': 'registries_response' },
            '/redfish/v1/Registries/BiosAttributeRegistryU34.v1_1_20/': { 'GET': 'bios_attributes_response' },
            '/redfish/v1/registrystore/registries/en/biosattributeregistryu34.v1_1_20/': { 'GET': 'registrystore_response' },
            '/redfish/v1/systems/1/bios/settings/': { 'GET': 'get_bios_response', 'PATCH': 'patch_bios_response' }
        });
        // mockProvider.strategy = new DumpRestStrategy('rbsu');
        
        await client.login(USER, PASS);
        var currentRBSU = (await rbsu.getRBSUdata())[0];
        var rbsuOption = (await rbsu.getRegistryOption(currentRBSU))[0];
        var registry = await rbsu.getRegistryContent(rbsuOption);
        var nextRBSU = await rbsu.getNextSetting(currentRBSU);
        nextRBSU.Attributes.AdminPhone = '857-5309';
        var res = await rbsu.updateRBSU(registry, currentRBSU, nextRBSU);

        assert.equal('iLO.2.2.SystemResetRequired', res.body.error['@Message.ExtendedInfo'][0].MessageId);
    });
});
