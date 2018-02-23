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

var login_account = 'admin';
var login_password = 'admin123';

var rest = require(MODULE);
var client = rest.redfishClient(SERVER);

var url = require('url');

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
		var new_session = {'UserName': login_account, 'Password': login_password};
		return client.post('/redfish/v1/Sessions/', new_session).catch((err) => {
			console.log('\n  Post Failed\n');
			throw err;
		});
	})

	.then((res) => {
		console.log('EXAMPLE 14: Create/Use/Delete a user session');
		if (res.statusCode == 201) {
			var session_uri = res.headers['location'];
			session_uri = url.parse(session_uri);
			console.log('Session ' + session_uri.path + ' created');

			var x_auth_token = res.headers['x-auth-token'];
			console.log('Session Key ' + x_auth_token + ' created');

			//  Delete the created session
			return client.delete(session_uri.path).catch((err) => {
				console.log('\n  Delete the created session failed\n');
				throw err;
			});
		} else {
			console.log('ERROR: failed to create a session.');
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
