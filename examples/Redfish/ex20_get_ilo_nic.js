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

var get_active = true;

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
		console.log('EXAMPLE 20: Get iLO\'s NIC configuration');
		for (let nic of arguments) {
			if (get_active && nic.body['Status']['State'] == 'Enabled')
				console.log('Active\t' + nic.body['@odata.id'] + ': ' + JSON.stringify(nic.body));
			else if (get_active == false && nic['Status']['State'] == 'Disabled')
				console.log('InActive\t' + nic.body['@odata.id'] + ': ' + JSON.stringify(nic.body));
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
