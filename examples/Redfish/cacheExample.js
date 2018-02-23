'use strict';


var rest = require('../../dist/index');
var baseUrl = 'https://10.10.10.10',
    userName = '', password = '',
    biosPassword = null, sessionKey = null,
    defaultPrefix = '/redfish/v1',
    timeout = 90, concurrent = 5,
    cacheOptions = {
        type: rest.cacheFactory.RAMCACHE,
        capacity: 20
    };
var before, after;
var client = rest.redfishClient(baseUrl, userName, password,
                                biosPassword, sessionKey,
                                defaultPrefix, timeout, concurrent,
                                cacheOptions);

console.log('Client initialized');

client.login()
    .then((res) => {
        console.log('Login');
        return res;
    })
    .then((res) => {
        var root = client.root;
        var promises = [];
        //console.log(root);
        before = new Date();
        console.log('Get link(s) informations...');
        if (root.Links) {
            for (let x in root) {
                if (root.hasOwnProperty(x) && root[x].hasOwnProperty('@odata.id')) {
                    promises.push(client.get(root[x]['@odata.id'], null, true));
                    //promises.push(client.get(root[x]['@odata.id'], null, true));
                }
            }
            return promises;
        }
        throw Error('No link(s)');
    })
    .spread(() => {
        var cache;
        var root = client.root;
        var promises = [];

        after = new Date();

        // cache = rest.cacheFactory.get('http');
        // console.log(cache.info());
        console.log('Elapse time(ms): ' + (after - before));
        console.log('Get link(s) informations again...');
        if (root.Links) {
            before = new Date();
            for (let x in root) {
                if (root.hasOwnProperty(x) && root[x].hasOwnProperty('@odata.id')) {
                    promises.push(client.get(root[x]['@odata.id'], null, true));
                   // promises.push(client.get(root[x]['@odata.id'], null, true)
                   //     .then((res) => {
                   //         console.log(JSON.parse(res.body));
                   //     }));
                }
            }
            return promises;
        }

        // console.log(cache.info());
    })
    .spread(() => {
        var cache;
        after = new Date();
        console.log('Elapse time(ms): ' + (after - before));
        // cache = rest.cacheFactory.get('http');
        // console.log(cache.info());
    })
    .catch((err) => {
        console.log(err);
    })
    .finally((res) => {
        console.log('Logout');
        return client.logout();
    });
