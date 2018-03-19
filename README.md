[![Build Status](https://travis-ci.org/HewlettPackard/javascript-ilorest-library.svg?branch=master)](https://travis-ci.org/HewlettPackard/javascript-ilorest-library)
[![npm version](https://badge.fury.io/js/ilorest.svg)](https://badge.fury.io/js/ilorest)
[![Coverage Status](https://coveralls.io/repos/github/HewlettPackard/javascript-ilorest-library/badge.svg?branch=master)](https://coveralls.io/github/HewlettPackard/javascript-ilorest-library?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/hewlettpackard/javascript-ilorest-library/badge.svg)](https://snyk.io/test/github/hewlettpackard/javascript-ilorest-library)
[![Dependency Status](https://david-dm.org/HewlettPackard/javascript-ilorest-library.svg)](https://david-dm.org/HewlettPackard/javascript-ilorest-library)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://raw.githubusercontent.com/HewlettPackard/javascript-ilorest-library/master/LICENSE)
# ilorest

[![Join the chat at https://gitter.im/HewlettPackard/javascript-ilorest-library](https://badges.gitter.im/HewlettPackard/javascript-ilorest-library.svg)](https://gitter.im/HewlettPackard/javascript-ilorest-library?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
> JavaScript Library for Hewlett Packard Enterprise iLO RESTful/Redfish API

## Installation
### Windows
```
$ npm install -g windows-build-tools
$ npm install --save ilorest
```
### Linux
```
$ npm install --save ilorest
```

## Usage
### HTTP(s) mode
```
var rest = require('ilorest');
var client = rest.redfishClient('https://10.10.10.10');
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
```
### Local(Blobstore) mode
```
var rest = require('ilorest');
var client = rest.redfishClient('blobstore://');
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
```


## Build from source
This project uses the [Gulp](http://gulpjs.com/) build system.  To build the project:

- NPM depedency install
```
$ npm install
```
- Build the project
```
$ npm run compile
$ npm run prepublish
```

## Browserify
```
$ npm install ilorest

$ browserify -r ilorest --im > bundle.js
```

## License

Apache-2.0 © [Hewlett Packard Enterprise](https://www.hpe.com)
