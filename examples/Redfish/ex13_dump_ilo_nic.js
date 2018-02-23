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
			console.log('\n  Get Accounts Failed\n');
			throw err;
		});
	})

	.then((res) => {
		var member, promises = [];
		for (let member of res.body.Members) {
			promises.push(client.get(member['@odata.id']));
		}
		return promises;
	})

	.spread(function () {
		console.log('EXAMPLE 13: Get iLO NIC state');
		for (let res of arguments) {
			if (res.body['Status']['State'] == "Enabled") {
				console.log(res.body['Name']);
			
				if (res.body['MACAddress']) 
					console.log('MAC: ' + res.body['MACAddress']);
				else
					console.log('NO MACAddress information available (no \'MACAddress\' property in NIC resource)');

				console.log('Speed: ' + res.body['SpeedMbps']);

				if (res.body['Autosense'])
					console.log('Autosense: ' + res.body['Autosense']);
				else
					console.log('No Autosense information available');

				console.log('Full Duplex: ' + res.body['FullDuplex']);

				if (res.body['FQDN'])
					console.log('FQDN: ' + res.body['FQDN']);
				else
					console.log('No FQDN information available');

				for (let addr of res.body['IPv4Addresses']) {
					console.log('IPv4 Address: ' + addr['Address'] + ' from ' + addr['AddressOrigin']);
				}

				if (res.body['IPv6Addresses']) {
					for (let addr of res.body['IPv6Addresses']) {
						console.log('IPv6 Address: ' + addr['Address'] + ' from ' + addr['AddressOrigin']);
					}
				} else
					console.log('IPv6Addresses information not available');
				
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
