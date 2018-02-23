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
        var uri, itemUri;
        for (let item of res.body.Instances) {
            itemUri = item['@odata.id'];
            if(itemUri.endsWith('/Boot/Settings/')) {
                uri = itemUri;
            }
        }
        return client.get(uri).catch((err) => {
            console.log('\n  Get Boot/Settings Failed\n');
            throw err;
        });
    })

    .then((res) => {
        var body = {}, uri, lastTwo;

        body.PersistentBootConfigOrder = res.body.PersistentBootConfigOrder;
        uri = res.request.uri.pathname;
        
        console.log('Switching last two entries in Boot Order');
        
        lastTwo = [body.PersistentBootConfigOrder.pop(), body.PersistentBootConfigOrder.pop()];
        body.PersistentBootConfigOrder.push(lastTwo.shift(), lastTwo.shift());
        
        return client.patch(uri, body).catch((err) => {
            console.log('\n  Patch Boot/Settings Failed\n');
            throw err;
        });
    })

    .then(function(res) {
        console.log('SUCCESS:', res.body.error['@Message.ExtendedInfo'][0].MessageId);
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
        console.log('Logout');
        return client.logout();
    })
    .catch((err) => {
        console.log(err);
    });
    
