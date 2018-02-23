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
        console.log('Get RBSU data');
        if (res && res.length > 0) {
            if (res[0]) {
                var rbsuData = res[0];
            } else {
                throw 'ERROR: Cannot get RBSU data';
            }
        } else {
            throw 'ERROR: Cannot get RBSU data';
        }
        return [
            rbsuData,
            rbsu.getRegistryOption(rbsuData)
                .catch((err) => {
                    console.log('\n  Get registry options Failed\n');
                    throw err;
                })
        ];
    })
    .spread((rbsuData, res) => {
        console.log('Get Registry data');
        return [
            rbsuData,
            rbsu.getRegistryContent(res[0])
                .catch((err) => {
                    console.log('\n  Get registry content Failed\n');
                    throw err;
                })
        ];
    })
    .spread((currentRBSU, res) => {
        var registry = res;
        return [
            registry,
            currentRBSU,
            rbsu.getNextSetting(currentRBSU)
        ];
    })
    .spread((registry, currentRBSU, nextRBSU) => {
		nextRBSU.Attributes.UefiShellStartup = 'Enabled';
		nextRBSU.Attributes.UefiShellStartupLocation = '10.0.0.0';
		nextRBSU.Attributes.UefiShellStartupUrl = 'test.com';
        return rbsu.updateRBSU(registry, currentRBSU, nextRBSU);
    })
    .then((res) => {
        if (res) {
            console.log('Updated RBSU settings');
            console.log('Message:', res.body.error['@Message.ExtendedInfo'][0].MessageId);
        } else {
            console.log('Failed to update RBSU');
        }
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
    
