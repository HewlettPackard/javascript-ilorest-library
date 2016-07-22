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
        return rbsu.getRBSUdata()
                .catch((err) => {
                    console.log('\n  getRBSUdata Failed\n');
                    throw err;
                });
    })

    .then((res) => {
        var rbsuData = res[0];
        return [
            rbsuData,
            rbsu.getRegistryOption(rbsuData)
                .catch((err) => {
                    console.log('\n  Get registryUri Failed\n');
                    throw err;
                })
        ];
    })
    .spread((rbsuData, res) => {
        var registryUri = res[0].Uri.extref;
        return [
            rbsuData,
            client.get(registryUri)
                .catch((err) => {
                    console.log('\n  getRegistryOption Failed\n');
                    throw err;
                })
        ];
    })
    .spread((currentRBSU, res) => {
        var registry = res.body;
        var nextRBSU = JSON.parse(JSON.stringify(currentRBSU));
        nextRBSU.AdminPhone = '857-5309';       
        return rbsu.updateRBSU(registry, currentRBSU, nextRBSU)
                .catch((err) => {
                    console.log('\n  updateRBSU Failed\n');
                    throw err;
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
        return client.logout();
    })
    .catch((err) => {
        console.log(err);
    });
    
