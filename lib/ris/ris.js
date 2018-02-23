'use strict';
/*
 *   (c) Copyright 2018 Hewlett Packard Enterprise Development LP

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

import { rbsu } from './rbsu/rbsu';

const risObj = {
    /**
        Function to init RBSU
        * @memberof ris
        * @method rbsu
        * @param {object} client - Instance of {@link httpClient}
        * @return {rbsu} - Instance of RBSU class
    */
    rbsu: function(client) {
        return new rbsu(client);
    },
};

export function ris() {
    return risObj;
}
