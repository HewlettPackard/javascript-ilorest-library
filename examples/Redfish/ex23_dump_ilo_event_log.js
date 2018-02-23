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

var entries_res;

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
            if(itemType && itemType.startsWith('#LogService.') && itemUri.endsWith('IEL/')) {
                uri = itemUri;
            }
        }        
        if (!uri) { throw('ERROR: Type not found'); }

        return client.get(uri).catch((err) => {
            console.log('\n  Get Log Service Failed\n');
            throw err;
        });
    })

	.then((res) => {
		return client.get(res.body['Entries']['@odata.id']).catch((err) => {
			console.log('\n  Get Entries Failed\n');
			throw err;
		});
	})

	.then((res) => {
		entries_res = res;
		var promises = [];
		for (let entry of res.body['Members']) {
			promises.push(client.get(entry['@odata.id']));
		}
		return promises;
	})

	.spread(function () {
		console.log('EXAMPLE 23: Dump iLO Event Log');
		for (let res of arguments) {
			console.log(res.body['Message']);
			
			while (entries_res.body['Members']['NextPage']) {
				var response = client.get(entries_res.body['@odata.id'] + '?page=' + res.body['Entries']['NextPage']['page'])
					.catch((err) => {
						console.log(err);
					});
				console.log(response.body['Message']);
			}
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
