'use strict';


var rest = require('../../dist/index');
var client = rest.redfishClient('https://10.10.10.10');

console.log('Client initialized');

client.login()
    .then((res) => {
        console.log('Login');
        return res;
    })
    .then((res) => {
        var root = client.root;
        var promises = [];
        console.log(root);
        if (root.Links) {
            for (let x in root) {
                if (root.hasOwnProperty(x) && root[x].hasOwnProperty('@odata.id')) {
                    promises.push(client.get(root[x]['@odata.id'])
                        .then((res) => console.log(res.body)));
                }
            }
            return promises;
        }
        throw Error('No link(s)');
    })
    .spread(() => {
        console.log('Get link(s) informations');
    })
    .catch((err) => {
        console.log(err);
    })
    .finally((res) => {
        console.log('Logout');
        return client.logout();
    });
