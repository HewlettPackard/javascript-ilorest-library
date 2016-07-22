[![Build Status](https://travis-ci.org/HewlettPackard/javascript-ilorest-library.svg?branch=master)](https://travis-ci.org/HewlettPackard/javascript-ilorest-library)
[![npm version](https://badge.fury.io/js/ilorest.svg)](https://badge.fury.io/js/ilorest)
[![Coverage Status](https://coveralls.io/repos/github/HewlettPackard/javascript-ilorest-library/badge.svg?branch=master)](https://coveralls.io/github/HewlettPackard/javascript-ilorest-library?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/hewlettpackard/javascript-ilorest-library/badge.svg)](https://snyk.io/test/github/hewlettpackard/javascript-ilorest-library)
[![Dependency Status](https://david-dm.org/HewlettPackard/javascript-ilorest-library.svg)](https://david-dm.org/HewlettPackard/javascript-ilorest-library)
[![License](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://raw.githubusercontent.com/HewlettPackard/javascript-ilorest-library/master/LICENSE)
# ilorest

[![Join the chat at https://gitter.im/HewlettPackard/javascript-ilorest-library](https://badges.gitter.im/HewlettPackard/javascript-ilorest-library.svg)](https://gitter.im/HewlettPackard/javascript-ilorest-library?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
> Javascript SDK for Hewlett Packard Enterprise Restful/Redfish API

## Installation
```
$ npm install --save ilorest
```

## Usage
```
var rest = require('ilorest');
var client = rest.restClient('https://10.10.10.10');
client.login("admin", "password123")
    .then(function (res) {
        console.log(res);
    })
    .catch(function (err) {
        console.log(err);
    });
```

## Build from source
This project uses the [Gulp](http://gulpjs.com/) build system.  To build the project:

- Install Gulp (globally)
```
$ npm install -g gulp
```
- NPM depedency install
```
$ npm install
```
- Build the project
```
$ gulp prepublish
```

## Browserify
```
$ npm install ilorest

$ browserify -r ilorest > bundle.js
```

## License

Apache-2.0 © [Hewlett Packard Enterprise](https://www.hpe.com)
