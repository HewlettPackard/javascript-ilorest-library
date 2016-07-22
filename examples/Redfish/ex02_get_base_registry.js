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
        var rdUrl = client.root.Registries['@odata.id'];
        return client.get(rdUrl);
    })
    .catch((err) => {
        console.log('\n  Get Registries Failed\n');
        throw err;
    })

    .then((res) => {
        var promises = [];
        for (let item of res.body.Members) {
            var uri = item['@odata.id'];
            if(uri.indexOf('/Base/') > 0 || uri.indexOf('/iLO/') > 0) {
                promises.push(client.get(uri));
            }
        }
        return promises;
    })
    .catch((err) => {
        console.log('\n  Parse Members Failed\n');
        throw err;
    })

    .spread(function () {
        var promises = [];
        for (let res of arguments) {
            for (let locale of res.body.Location) {
                var uri = locale.Uri.extref || locale.Uri;
                if ('en' === locale.Language) {
                    promises.push(client.get(uri));
                }
            }
        }
        return promises;
    })
    .catch((err) => {
        console.log('\n  Parse Language Failed\n');
        throw err;
    })

    .spread(function() {
        for (let res of arguments) {
            console.log('Retrieved Registry "' + res.body.RegistryPrefix + '"');
        }
    })
    .catch((err) => {
        console.log('\n  Get Registry Failed\n');
        throw err;
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
    });
    
