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

var MODULE = '../../dist';
var SERVER = process.env.SERVER; // 'https://10.10.10.10'
var USER   = process.env.USER;   // 'username'
var PASS   = process.env.PASS;   // 'pa55w0rd'
var BPASS  = process.env.BPASS;  // 'PA55W0RD'

var rest = require(MODULE);
var client = rest.redfishClient(SERVER, USER, PASS, BPASS);

var ris = rest.ris();
var rbsu = ris.rbsu(client);

console.log('Client initialized');

client.login(USER, PASS)
    .then((res) => {
        console.log('Login');
        return res;
    })
    .catch((err) => {
        console.log('\n  Login Failed\n');
        throw err;
    })

    .then(function() {        
        return client.get(client.root.Systems['@odata.id'])
            .catch((err) => {
                console.log('\n  Get Systems Failed\n');
                throw err;
            });
    })

    .then(function(res) {        
        return client.get(res.body.Members[0]['@odata.id'])
            .catch((err) => {
                console.log('\n  Get System[0] Failed\n');
                throw err;
            });
    })

    .then(function(res) {        
        var bios = client.get(res.body.Oem.Hp.Links.BIOS['@odata.id']);
        var aRbsuData = rbsu.getRBSUdata();
        return [
            bios,
            aRbsuData.catch((err) => {
                console.log('\n  getRBSUdata Failed\n');
                throw err;
            })
        ];
    })

    .spread((bios, aRbsuData) => {
        var baseConfigs = client.get(bios.body.links.BaseConfigs.href);
        var rbsuData = aRbsuData[0];
        return [
            baseConfigs,
            rbsuData,
            rbsu.getRegistryOption(rbsuData).catch((err) => {
                console.log('\n  getRegistryOption/BaseConfigs Failed\n');
                throw err;
            })
        ];
    })

    .spread((baseConfigs, rbsuData, res) => {
        var nextRBSU;
        for (let config of baseConfigs.body.BaseConfigs) {
            nextRBSU = config.default ? config.default : nextRBSU;
        }        
        var registryUri = res[0].Uri.extref;
        return [
            rbsuData,
            nextRBSU,
            client.get(registryUri).catch((err) => {
                console.log('\n  Get registryUri/BaseConfigs[default] Failed\n');
                throw err;
            })
        ];
    })

    .spread((currentRBSU, nextRBSU, res) => {
        var registry = res.body;
        return rbsu.updateRBSU(registry, currentRBSU, nextRBSU)
            .catch((err) => {
                throw(err + '\n  updateRBSU Failed\n');
            });
    })

    .then((res) => {        
        console.log('Updated RBSU settings');
        console.log('Message:', res.body.error['@Message.ExtendedInfo'][0].MessageId);
        return res;
    })
    .catch((err) => {
        if (err.constructor.name === 'StatusCodeError') {
            console.log('\n' + err.error.error['@Message.ExtendedInfo'][0].MessageId + '\n');
        }
        else {
            console.log(err);
        }
    })

    .finally(() => {
        console.log('Logout');
        return client.logout();
    })
    .catch((err) => {
        console.log(err);
    });
    
