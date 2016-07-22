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

import Promise from 'bluebird';

/** RBSU class */
class rbsu {

    /**
        * RBSU This class is initiated by other helper function. User won't need to initiate it directly.
        * Data structure used by this class is OData-Version: 4.0
    */
    constructor (client) {
        rbsu.client = client;
        rbsu.biosSetting = null;
        rbsu.headers = {};
        rbsu.headers['OData-Version'] = '4.0';
    }
    getRegistryContent (schemaData) {
        console.log(schemaData);
        return rbsu.client.get(schemaData.Uri.extref, null, null, rbsu.headers).then((res)=>{
            return res.body;
        })
        .catch((err)=>{
            console.error(err);
            return null;
        });
    }
    /*
        Get schema options for current RBSU setting
    */
    getRegistryOption (rbsuData) {
        if (rbsuData.hasOwnProperty('AttributeRegistry')) {
            var AttributeRegistry = rbsuData.AttributeRegistry;
        }
        return rbsu.client.getRootObject(rbsu.headers)
        .then((res) => {
            return rbsu.client.get(res.body.Registries['@odata.id'], null, null, rbsu.headers);
        })
        .then((res) => {
            var registryItems = res.body.Members;
            for (var key in registryItems) {
                var registryURL = res.body['@odata.id'] + AttributeRegistry + '/';
                if (registryURL === registryItems[key]['@odata.id']) {
                    return rbsu.client.get(registryItems[key]['@odata.id'], null, null, rbsu.headers);
                }
            }
            console.log('ERROR: Could not find correct RBSU Registry');
            console.log('We can still return the closest, but let\'s just return null for now');
            return null;
        })
        .then((res) => {
            if (!res || res === null) {
                return null;
            } else if (res.body && res.body.Location) {
                return res.body.Location;
            } else {
                return null;
            }
        });
    }
    /*
        Returns settings of this RBSU which will be applied after next reboot
    */
    getNextSetting (rbsuData) {
        if (!rbsuData.links || !rbsuData.links.Settings) {
            return null;
        }
        return rbsu.client.get(rbsuData.links.Settings.href, null, null, rbsu.headers)
        .then((res) => {
            console.log(res);
            return res.body;
        })
        .catch((err) => {
            return null;
        });
    }
    /**
     * Retrieve the RBSU data
     * @return {promise} A Promise object which returns the HTTP response after login
     */
    getRBSUdata () {
        var rbsuDataCollection = [];
        return rbsu.client.getRootObject(rbsu.headers)
        .then((res) => { //GET system
            if (res.body.Systems && res.body.Systems['@odata.id']) {
                return rbsu.client.get(res.body.Systems['@odata.id'], null, null, rbsu.headers);
            }
        })
        .then((res) => { //GET data from each system node and return an array of promise
            res.body.Members.forEach(node => {
                rbsuDataCollection.push(node);
            });
            var systemArray = rbsuDataCollection.map((obj) => {
                return rbsu.client.get(obj['@odata.id'], null, null, rbsu.headers);
            });
            return systemArray;
        }) //Resolve promise array of system node
        .then(function (systemArray) {
            return Promise.all(systemArray);
        }) //Get BIOS data from each system node
        .then((result) => {
            var biosLinkArray = result.map((obj) => {
                try {
                    return rbsu.client.get(obj.body.Oem.Hp.Links.BIOS['@odata.id']);
                } catch (error) {
                    console.log(error);
                }
            });
            return Promise.all(biosLinkArray);
        })
        .then((result) => {
            rbsu.biosSetting = result.map((obj) => {
                if (obj.body) {
                    return obj.body;
                }
            });
            return rbsu.biosSetting;
        })
        .catch((err)=>{
            console.log(err);
        });
    }

    /*
        Check if newRBSU obeys dependency rules
        Dependecy parser BETA
    */
    validateRBSU (registry, currentRBSU, nextRBSU) {
        var returnData = {
            registry : {},
            RBSU: {},
            modified: []
        };
        var tempRBSU = {};
        var attribute = registry.RegistryEntries.Attributes;
        for (var key in attribute) {
            tempRBSU[attribute[key].Name] = attribute[key];
            if (nextRBSU[attribute[key].Name] !== currentRBSU[attribute[key].Name]) {
                tempRBSU[attribute[key].Name].CurrentValue = nextRBSU[attribute[key].Name];
            } else {
                tempRBSU[attribute[key].Name].CurrentValue = currentRBSU[attribute[key].Name];
            }
        }
        var dependency = registry.RegistryEntries.Dependencies;
        for (key in dependency) {
            var mapFrom = dependency[key].Dependency.MapFrom, evalStr = '';
            for (var index in mapFrom) { //Constructing eval string
                var obj = mapFrom[index];
                evalStr += ` ${obj.MapTerms? obj.MapTerms:''} (tempRBSU["${obj.MapFromAttribute}"].${obj.MapFromProperty} ${obj.MapFromCondition} "${obj.MapFromValue}")`;
            }
            var check = false;
            try {
                check = eval(evalStr);
            } catch (err) {
                console.error('Dependency rule parsing error: ' + check);
                continue;
            }
            if (check) {
                var mapTo = dependency[key].Dependency, tmpValue, checkStr = null;
                if (typeof(mapTo.MapToValue) === 'string') {
                    tmpValue = `"${mapTo.MapToValue}"`;
                } else {
                    tmpValue = `${mapTo.MapToValue}`;
                }
                if (tempRBSU[mapTo.MapToAttribute]) {
                    checkStr = `tempRBSU["${mapTo.MapToAttribute}"]["${mapTo.MapToProperty}"] === ${tmpValue}`;
                } else {
                    var menuObj = registry.RegistryEntries.Menus;
                    for (index in menuObj) {
                        if (menuObj[index].Name === mapTo.MapToAttribute) {
                            checkStr = `menuObj[${index}]["${mapTo.MapToProperty}"] === ${tmpValue}`;
                        }
                    }
                }
                if (!checkStr) {
                    console.error('Attribute not found: ' + mapTo.MapToAttribute);
                    continue;
                }
                try {
                    var actionStr = checkStr.replace('===', '='), force = false;
                    if (tempRBSU[mapTo.MapToAttribute] && (mapTo.MapToProperty === 'CurrentValue')) {
                        if (tempRBSU[mapTo.MapToAttribute].CurrentValue) {
                            force = true;
                        }
                    }
                    if (!eval(checkStr)) {
                        returnData.modified.push({
                            type: tempRBSU[mapTo.MapToAttribute]? 'Attributes':'Menus',
                            name: mapTo.MapToAttribute,
                            attribute: mapTo.MapToProperty,
                            value: mapTo.MapToValue,
                            force: force,
                            why: mapFrom
                        });
                        eval(actionStr);
                    }
                } catch (err) {
                    console.error('eval error, check string: ' + checkStr);
                    console.error('eval error, action string: ' + checkStr);
                }
            }
        }
        for (key in tempRBSU) {
            returnData.RBSU[key] = tempRBSU[key].CurrentValue;
        }
        returnData.registry = registry;
        return returnData;
    }
    updateRBSU (registry, currentRBSU, nextRBSU) {
        var settingURI = currentRBSU.links.Settings.href;
        var data = this.validateRBSU(registry, currentRBSU, nextRBSU);
        for (var key in data.modified) {
            if (data.modified[key].force) {
                return false;
            }
        }
        return rbsu.client.patch(settingURI, nextRBSU);
    }
}

export {rbsu};
