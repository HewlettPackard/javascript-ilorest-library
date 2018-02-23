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

var schema_prefix = 'ComputerSystem';
var extref_uri;

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
        var rdUrl = client.root.JsonSchemas['@odata.id'];
        return client.get(rdUrl).catch((err) => {
            console.log('\n  Get Schemas Failed\n');
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
		for (let schema of arguments) {
			if (schema.body['Schema'].startsWith(schema_prefix)) {
				for (let location of schema.body['Location']) {
					extref_uri = location['Uri']['extref'];
					return client.get(extref_uri).catch((err) => {
						console.log('\n  Get ' + extref_uri + ' Failed\n');
						throw err;
					});
				}
			}
		}
	})

	.then((res) => {
		console.log('EXAMPLE 27: Find and return schema ' + schema_prefix);
		if (res.statusCode == 200) {
			console.log('Found ' + schema_prefix + ' at ' + extref_uri);
			return ;
		} else {
			console.log(schema_prefix + ' not found at ' + extref_uri);
			return ;
		}
		console.log('Registry ' + schema_prefix + ' not found.');
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
