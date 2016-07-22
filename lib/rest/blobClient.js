'use strict';
/*
 *   Copyright 2016 Hewlett Packard Enterprise Development LP

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

// TODO:

/**
    * CHIF client class
    * @extends baseClient
*/
class blobClient extends baseClient {
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
    }
    __getReqHeaders (headers, providerHeader) {
        headers = super.__getReqHeaders(headers, providerHeader);

        return null;
    }
    restRequest (path, method='GET', args=null, body=null, headers=null,
                 optionalPassword=null, providerHeader=null, useCache=false) {

        return null;
    }
}

export {blobClient};
