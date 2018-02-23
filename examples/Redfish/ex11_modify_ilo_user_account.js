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

/*****	new user information ***************/
var ilo_loginname_to_modify = 'name';
var new_ilo_loginname = 'newname';
var new_ilo_username = 'username';
var new_ilo_password = 'password';
var irc = true;
var cfg = true;
var virtual_media = true;
var usercfg = true;
var vpr = true;
/******************************************/

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
            if(itemType && itemType.startsWith('#AccountService.')) {
                uri = itemUri;
            }
        }        
        if (!uri) { throw('ERROR: Type not found'); }

        return client.get(uri).catch((err) => {
            console.log('\n  Get Account Service Failed\n');
            throw err;
        });
    })

	.then((res) => {
		return client.get(res.body['Accounts']['@odata.id']).catch((err) => {
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
		for (let res of arguments) {
			if (res.body['UserName'] == ilo_loginname_to_modify) {
				var body = {};
				var body_oemhp = {};
				var body_oemhp_privs = {};
				
				//  if new loginname or password specified
				if (new_ilo_password)
					body['Password'] = new_ilo_password;
				if (new_ilo_loginname)
					body['UserName'] = new_ilo_loginname;

				//  if different username specified
				if (new_ilo_username)
					body_oemhp['LoginName'] = new_ilo_username;

				//  if different privileges were requested (None = no change)
				if (irc != null)
					body_oemhp_privs['RemoteConsolePriv'] = irc;
				if (virtual_media != null)
					body_oemhp_privs['VirtualMediaPriv'] = virtual_media;
				if (cfg != null)
					body_oemhp_privs['iLOConfigPriv'] = cfg;
				if (usercfg != null)
					body_oemhp_privs['UserConfigPriv'] = usercfg;
				if (vpr != null)
					body_oemhp_privs['VirtualPowerAndResetPriv'] = vpr;

				//  component assembly
				if (Object.keys(body_oemhp_privs) > 0)
					body_oemhp['Privileges'] = body_oemhp_privs;
				if (Object.keys(body_oemhp) > 0)
					body['Oem'] = {'Hp': body_oemhp};

				console.log('SUCCESS: Modify iLO User Account: ' + res.body['@odata.id']);
				
				return client.patch(res.body['@odata.id'], body)
					.catch((err) => {
						console.log('\n  Add iLO User Account Failed\n');
						throw err;
					});
			}
		}
		console.log('Account not found');
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
