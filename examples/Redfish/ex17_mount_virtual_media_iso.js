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

var iso_url  = 'http://10.0.0.100/test.iso';
var boot_on_next_server_reset = true;

var rest = require(MODULE);
var client = rest.redfishClient(SERVER);

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

    .then(() => {
        var rdUrl = client.root.Oem.Hpe.Links.ResourceDirectory['@odata.id'];
        return client.get(rdUrl).catch((err) => {
            console.log('\n  Get ResourceDirectory Failed\n');
            throw err;
        });
    })

    .then((res) => {
        var uri, itemUri, itemType;
        for (let item of res.body.Instances) {
            itemType = item['@odata.type'];
            itemUri = item['@odata.id'];
            if(itemType && itemType.startsWith('#Manager.')) {
                uri = itemUri;
            }
        }        
        if (!uri) { throw('ERROR: Type not found'); }

        return client.get(uri).catch((err) => {
            console.log('\n  Get Manager Failed\n');
            throw err;
        });
    })

	.then((res) => {
		return client.get(res.body['VirtualMedia']['@odata.id']).catch((err) => {
			console.log('\n  Get Virtual Media Failed\n');
			throw err;
		});
	})

	.then((res) => {
		var promises = [];
		for (let vmlink of res.body['Members']) {
			promises.push(client.get(vmlink['@odata.id']));
		}
		return promises;
	})

	.spread(function () {
		console.log('EXAMPLE 17: Mount iLO Virtual Media DVD ISO from URL');
		var promises = [];
		for (let res of arguments) {
			if (res.statusCode == 200 && res.body['MediaTypes'].indexOf('DVD') != -1) {
				var body = {'Image': iso_url};

				//  TODO: need to check for redfish support
				if (iso_url && boot_on_next_server_reset) {
					body['Oem'] = {'Hp': {'BootOnNextServerReset': boot_on_next_server_reset}};
					console.log('Patch ' + JSON.stringify(body) + ' to ' + res.body['@odata.id']);
					promises.push(client.patch(res.body['@odata.id'], body).catch((err) => {
						console.log('Patch ' + res.body['@odata.id'] + ' Failed');
					}));
				}
			} else if (res.statusCode != 200) {
				console.log('Get ' + res.body['@odata.id'] + ' Failed');
			}
		}
		return promises;
	})
	
	.spread(function () {
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
