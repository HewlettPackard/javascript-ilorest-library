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

import {_p, baseClient} from './base';

/**
    * HTTP client class
    * @extends baseClient
*/
class httpClient extends baseClient {
    /**
        * This class instance is initiated by helper function {@link restClient} or {@link redfishClient}
    */
    constructor (baseUrl, userName='', password='',
                biosPassword=null, sessionKey=null,
                defaultPrefix='/rest/v1', timeout=60,
                concurrent=5, cacheOptions=null,
                isRedfish=false) {

        super(baseUrl, userName, password, biosPassword,
              sessionKey, defaultPrefix, timeout,
              concurrent, cacheOptions);

        this.isRedfish = isRedfish;
        _p.get(this).rootPromise = this.getRootObject();
        _p.get(this).rootPromise
            .then((res) => {
                this.root = res.body;
                this.loginUrl = (this.isRedfish ?
                    this.root.Links.Sessions['@odata.id'] :
                    this.root.links.Sessions.href);
            })
            .catch(() => {
                this.root = null;
                this.loginUrl = null;
            });
    }
    __getReqHeaders (headers, providerHeader) {
        headers = super.__getReqHeaders(headers, providerHeader);

        if (this.isRedfish) {
            headers['OData-Version'] = '4.0';
        }
        return headers;
    }
    __formOptions (path, method='GET', args=null, body=null, headers=null,
            optionalPassword=null, providerHeader=null) {

        if (!this.isRedfish && path &&
                path.indexOf(this.defaultPrefix) >= 0 &&
                path.charAt(path.length - 1) === '/') {
            path.slice(0, path.length - 1);
        }
        else if (this.isRedfish && path &&
                path.indexOf(this.defaultPrefix) >= 0 &&
                path.charAt(path.length - 1) !== '/') {
            path = path + '/';
        }
        return super.__formOptions(path, method, args, body, headers,
                optionalPassword, providerHeader);
    }
    logout () {
        var __sessionLocation = this.getSessionLocation();

        if (!__sessionLocation) {
            return this.get(this.loginUrl)
                .catch(() => {
                    throw Error('Session location not found');
                })
                .then((res) => {
                    var info = res.body.Oem;
                    if (this.isRedfish) {
                        for (let key in info) {
                            if (info[key].Links && info[key].Links.MySession['@odata.id']) {
                                __sessionLocation = info[key].Links.MySession['@odata.id'];
                                break;
                            }
                        }
                    }
                    else {
                         for (let key in info) {
                            if (info[key].links && info[key].links.MySession.href) {
                                __sessionLocation = info[key].links.MySession.href;
                                break;
                            }
                        }
                    }
                    if (__sessionLocation) {
                        _p.get(this).sessionLocation = __sessionLocation;
                        return super.logout();
                    }
                    throw Error('Session location not found');
                });
        }
        else {
            return super.logout();
        }
    
    }
}

export {httpClient};
