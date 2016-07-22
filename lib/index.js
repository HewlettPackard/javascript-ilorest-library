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


/** @module ilorest */

import {httpClient} from './rest/httpClient';
//import {blobClient} from './rest/blobClient';


if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
        position = position || 0;
        return this.indexOf(searchString, position) === position;
    };
}

if (typeof Object.assign !== 'function') {
    (function () {
        Object.assign = function (target) {
            if (target === undefined || target === null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }

            var output = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var source = arguments[index];
                if (source !== undefined && source !== null) {
                    for (var nextKey in source) {
                        if (source.hasOwnProperty(nextKey)) {
                            output[nextKey] = source[nextKey];
                        }
                    }
                }
            }
            return output;
        };
    })();
}


function getClientInstance (baseUrl, userName, password,
                            biosPassword, sessionKey,
                            defaultPrefix, timeout,
                            concurrent, cacheOptions,
                            isRedfish=false) {
    if (!baseUrl || baseUrl.startsWith('blobstore://')) {
        //TODO:
        //      Load blobstore/hpilo C/C++ library
        //      Need to decide what access model we are going to use
    }
    else {
        return new httpClient(baseUrl, userName, password,
                              biosPassword, sessionKey,
                              defaultPrefix, timeout,
                              concurrent, cacheOptions,
                              isRedfish);
    }
}

/**
    * Initiate a client instance for HPE RESTful API
    * @param {string} baseUrl - URL or ip address to connect to
    * @param {string} userName - iLO user account
    * @param {string} password - Password of the account
    * @param {string} biosPassword - (Optional) password for BIOS
    * @param {string} sessionKey - (Optional) Session Key 在家別輕易嘗試
    * @param {string} defaultPrefix - (Optional) Default to '/rest/v1'. 沒事別亂改
    * @param {integer} timeout - Configure timeout in seconds. Default to 90.
    * @param {integer} concurrent - Maximum amount of concurrent request. Default to 5.
    * @param {string} cacheOptions - Just some options...you know...
    * @return If baseUrl is provided, a {@link httpClient} instance will be returned. Otherwise {@link blobClient} instance will be returned.
 */
export function restClient (baseUrl, userName='', password='',
                            biosPassword=null, sessionKey=null,
                            defaultPrefix='/rest/v1', timeout=90,
                            concurrent=5, cacheOptions=null) {

    return getClientInstance(baseUrl, userName, password,
                             biosPassword, sessionKey,
                             defaultPrefix, timeout,
                             concurrent, cacheOptions,
                             false);
}

/**
    * Initiate a client onstance for Redfish API
    * @param {string} baseUrl - URL or ip address to connect to
    * @param {string} userName - iLO user account
    * @param {string} password - Password of the account
    * @param {string} biosPassword - (Optional) password for BIOS
    * @param {string} sessionKey - (Optional) Session Key 在家別輕易嘗試
    * @param {string} defaultPrefix - (Optional) Default to '/rest/v1'. 沒事別亂改
    * @param {integer} timeout - Configure timeout in seconds. Default to 90.
    * @param {integer} concurrent - Maximum amount of concurrent request. Default to 5.
    * @param {string} cacheOptions - Just some options...you know...
    * @return If baseUrl is provided, a {@link httpClient} instance will be returned. Otherwise {@link blobClient} instance will be returned.
 */
export function redfishClient (baseUrl, userName='', password='',
                               biosPassword=null, sessionKey=null,
                               defaultPrefix='/redfish/v1', timeout=90,
                               concurrent=5, cacheOptions=null) {

    return getClientInstance(baseUrl, userName, password,
                             biosPassword, sessionKey,
                             defaultPrefix, timeout,
                             concurrent, cacheOptions,
                             true);
}

export {authMethod} from './rest/base';
export {cacheFactory} from './cache/cacheFactory';
export {throttle} from './throttle/throttle';
export {
    /**
        * Contains functions to init all ris features
        * @function
        * @return {ris} - Collection of functions for Initializing RIS features
     */
    ris
} from './ris/ris';
export {Promise} from 'bluebird';
export {zip as gzip, unzip as gunzip} from 'gzip-js';
