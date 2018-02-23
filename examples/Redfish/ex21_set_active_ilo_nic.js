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

var shared_nic = false;

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
		return client.get(res.body['EthernetInterfaces']['@odata.id']).catch((err) => {
			console.log('\n  Get Ethernet Interfaces Failed\n');
			throw err;
		});
	})

	.then((res) => {
		var promises = [];
		for (let entry of res.body['Members']) {
			promises.push(client.get(entry['@odata.id']));
		}
		return promises;
	})

	.spread(function () {
		console.log('EXAMPLE 21: Set the active iLO NIC');
		var selected_nic_uri;
		for (let nic of arguments) {
			if (nic.body['Oem']['Hp']['SupportsFlexibleLOM'] == true && shared_nic == true) {
				selected_nic_uri = nic.body['links']['self']['href'];
				break;
			}
			if (nic.body['Oem']['Hp']['SupportsLOM'] == true && shared_nic == true) {
				selected_nic_uri = nic.body['links']['self']['href'];
				break;
			}
			if (!shared_nic) {
				selected_nic_uri = nic.body['@odata.id'];
				break;
			} else if (!selected_nic_uri) {
				console.log('Shared NIC is not supported');
				break;
			}
		}

		if (selected_nic_uri) {
			var body = {'Oem': {'Hp': {'NICEnabled': true}}};
			console.log('Patch ' + JSON.stringify(body) + ' to ' + selected_nic_uri);
			return client.patch(selected_nic_uri, body).catch((err) => {
				console.log('Patch ' + JSON.stringify(body) + ' to ' + selected_nic_uri + ' Failed');
				throw err;
			});
		}
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
