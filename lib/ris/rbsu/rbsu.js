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

/*
    BIOS regitry URL will probably be unmatched for a while during the Gen10 development
    Creating this function to contain all workarounds before everything get fixed
*/
const isValidBiosRegistry = function(target, registry) {
    target = encodeURIComponent(target);
    registry = registry.split('/');
    registry = registry[registry.length - 2];

    if (target === registry) {
        //Idealy this statement should covers all
        return true;
    } else {
        //But we still need some workarounds during Gen10 development
        target = target.split('.')[0];
        registry = registry.split('.')[0];
        if (target === registry) {
            return true;
        }
    }
    return false;
};

/*
    Gen9/Gen10 have different object hierachy so this function returns object in an unified hierachy.
    Currently the unified hierachy looks like Gen9 (just to make things work) but I think Gen10 is better.
    Or we can have our own version if something good comes up. We'll see.
*/
const normalizeRBSUdata = function(data, isGen9, oem) {
    if (isGen9) {
        var unified_struct = {};
        unified_struct.Attributes = data;
        if (data.links && data.links.Settings) {
            unified_struct['@Redfish.Settings'] = {
                SettingsObject: {
                    '@odata.id': data.links.Settings.href,
                },
            };
        }
        if (data.AttributeRegistry) {
            unified_struct.AttributeRegistry = data.AttributeRegistry;
        }
        return unified_struct;
    } else {
        return data;
    }
    return null;
};

/*
    Retreive settings URI from rbsu data
*/
const getSettingsURI = function(rbsuData) {
    if (
        rbsuData['@Redfish.Settings'] &&
        rbsuData['@Redfish.Settings'].SettingsObject
    ) {
        return rbsuData['@Redfish.Settings'].SettingsObject['@odata.id'];
    } else {
        return null;
    }
};

/*
    Create conditional statement out of dependency object for dependency parser
    Compatiable with Gen9/Gen10
*/
const _create_conditional_statement = function(obj) {
    let evalStr = '';
    if (obj.MapFromCondition) {
        switch (obj.MapFromCondition) {
            case 'EQU':
                obj.MapFromCondition = '==';
                break;
            case 'NEQ':
                obj.MapFromCondition = '!=';
                break;
            default:
                break;
        }
    }
    if (obj.MapTerms && obj.MapTerms === 'AND') {
        obj.MapTerms = '&&';
    }
    evalStr = `${obj.MapTerms ? obj.MapTerms : ''} (tempRBSU.Attributes["${
        obj.MapFromAttribute
    }"].${obj.MapFromProperty} ${obj.MapFromCondition} "${obj.MapFromValue}")`;
    return evalStr;
};

/*
    Patch data in correct structure (Gen9/Gen10)
*/
const _patchData = function(rbsuData, isGen9) {
    var returnData = null;
    if (isGen9) {
        returnData = rbsuData.Attributes;
    } else {
        returnData = rbsuData;
    }
    return returnData;
};

/*
    Parse the output from dependency parser
    If it's violating the rules, a human-readable string will be returned as explanation.
    Return false if there's no violation.
*/
const isViolating = function(data) {
    if (!data || !data.modified) {
        return 'Error when checking data from dependency parser';
    }
    var violate = [];
    for (let key in data.modified) {
        if (data.modified[key].force) {
            violate.push(data.modified[key]);
        }
    }
    if (violate.length > 0) {
        var explanation =
            '[Invalid RBSU configuration]\n' +
            'Please correct RBSU setting based on following suggestions:\n';
        for (let key in violate) {
            explanation += `[${violate[key].name}] should be [${
                violate[key].value
            }] because: \n`;
            for (let index in violate[key].why) {
                let why = violate[key].why[index];
                explanation += `- ${why.MapFromAttribute}[${
                    why.MapFromProperty
                }] ${why.MapFromCondition} ${why.MapFromValue}\n`;
            }
        }
        return explanation;
    } else {
        return false;
    }
};

/** RBSU class */
class rbsu {
    /**
     * RBSU This class is initiated by other helper function. User won't need to initiate it directly.
     * Data structure used by this class is OData-Version: 4.0
     */
    constructor(client, password) {
        rbsu.client = client;
        if (password) {
            rbsu.addPassword(password);
        }
        rbsu.biosSetting = null;
        rbsu.headers = {};
        rbsu.headers['OData-Version'] = '4.0';
        rbsu.gen9 = false;
    }
    getRegistryContent(schemaData) {
        let registryUri = null;
        if (rbsu.gen9) {
            if (schemaData.Uri && schemaData.Uri.extref) {
                registryUri = schemaData.Uri.extref;
            }
        } else {
            if (schemaData.Uri) {
                registryUri = schemaData.Uri;
            }
        }
        if (registryUri) {
            return rbsu.client
                .get(registryUri, null, null, rbsu.headers)
                .then(res => {
                    return res.body;
                });
        } else {
            return null;
        }
    }
    /*
        Get schema options for current RBSU setting
    */
    getRegistryOption(rbsuData) {
        if (rbsuData.hasOwnProperty('AttributeRegistry')) {
            var AttributeRegistry = rbsuData.AttributeRegistry;
        }
        return rbsu.client
            .getRootObject(rbsu.headers)
            .then(res => {
                return rbsu.client.get(
                    res.body.Registries['@odata.id'],
                    null,
                    null,
                    rbsu.headers
                );
            })
            .then(res => {
                var registryItems = res.body.Members;
                for (var key in registryItems) {
                    if (
                        isValidBiosRegistry(
                            AttributeRegistry,
                            registryItems[key]['@odata.id']
                        )
                    ) {
                        return rbsu.client.get(
                            registryItems[key]['@odata.id'],
                            null,
                            null,
                            rbsu.headers
                        );
                    }
                }
                console.log('ERROR: Could not find correct RBSU Registry');
                console.log(
                    "We can still return the closest, but let's just return null for now"
                );
                throw 'ERROR: Could not find correct RBSU Registry';
            })
            .then(res => {
                if (res.body && res.body.Location) {
                    return res.body.Location;
                } else {
                    throw 'ERROR: Could not find correct RBSU Registry';
                }
            });
    }
    /*
        Returns settings of this RBSU which will be applied after next reboot
    */
    getNextSetting(rbsuData) {
        let settingsURI = getSettingsURI(rbsuData);
        if (settingsURI) {
            return rbsu.client
                .get(settingsURI, null, null, rbsu.headers)
                .then(res => {
                    return normalizeRBSUdata(res.body, rbsu.gen9, null);
                });
        } else {
            throw 'ERROR: Could not get pending RBSU setting';
        }
    }
    /**
     * Retrieve the RBSU data
     * @return {promise} A Promise object which returns the HTTP response after login
     */
    getRBSUdata() {
        var oem = null; // Oem info is needed in iLO 4
        var rbsuDataCollection = [];
        return rbsu.client
            .getRootObject(rbsu.headers)
            .then(res => {
                //GET system
                if (res.body.Systems && res.body.Systems['@odata.id']) {
                    if (res.body.hasOwnProperty('Oem')) {
                        //Check the OEM count, should be only 1 OEM.
                        if (Object.keys(res.body.Oem).length === 1) {
                            oem = Object.getOwnPropertyNames(res.body.Oem)[0];
                            if (res.body.Oem[oem]) {
                                if (
                                    res.body.Oem[oem].Manager &&
                                    res.body.Oem[oem].Manager.length === 1
                                ) {
                                    if (
                                        res.body.Oem[oem].Manager[0]
                                            .ManagerType === 'iLO 4'
                                    ) {
                                        // iLO 4 has different schema. Set the flag for future reference.
                                        rbsu.gen9 = true;
                                    } else {
                                        rbsu.gen9 = false;
                                    }
                                }
                                return rbsu.client.get(
                                    res.body.Systems['@odata.id'],
                                    null,
                                    null,
                                    rbsu.headers
                                );
                            }
                        } else {
                            throw 'Invalid Oem count';
                        }
                    }
                }
                throw 'Root object is not valid';
            })
            .then(res => {
                //GET data from each system node and return an array of promise
                res.body.Members.forEach(node => {
                    rbsuDataCollection.push(node);
                });
                var systemArray = rbsuDataCollection.map(obj => {
                    return rbsu.client.get(
                        obj['@odata.id'],
                        null,
                        null,
                        rbsu.headers
                    );
                });
                return systemArray;
            }) //Resolve promise array of system node
            .then(function(systemArray) {
                return Promise.all(systemArray);
            }) //Get BIOS data from each system node
            .then(result => {
                var biosLinkArray = result.map(obj => {
                    try {
                        if (rbsu.gen9) {
                            return rbsu.client.get(
                                obj.body.Oem[oem].Links.BIOS['@odata.id']
                            );
                        } else {
                            if (obj.body.Bios && obj.body.Bios['@odata.id']) {
                                return rbsu.client.get(
                                    obj.body.Bios['@odata.id']
                                );
                            }
                        }
                    } catch (error) {
                        throw error;
                    }
                });
                return Promise.all(biosLinkArray);
            })
            .then(result => {
                rbsu.biosSetting = result.map(obj => {
                    if (obj && obj.body) {
                        return normalizeRBSUdata(obj.body, rbsu.gen9, oem);
                    }
                });
                return rbsu.biosSetting;
            });
    }

    /*
        Check if newRBSU obeys dependency rules
        Dependecy parser BETA
    */
    validateRBSU(registry, currentRBSU, nextRBSU) {
        var returnData = {
            registry: {},
            RBSU: {},
            modified: [],
        };
        var tempRBSU = {
            Attributes: {},
        };

        var attribute = registry.RegistryEntries.Attributes;
        var attributeName, menuName;
        if (rbsu.gen9) {
            attributeName = 'Name';
            menuName = 'Name';
        } else {
            attributeName = 'AttributeName';
            menuName = 'MenuName';
        }
        for (var key in attribute) {
            tempRBSU.Attributes[attribute[key][attributeName]] = attribute[key];
            if (
                nextRBSU.Attributes[attribute[key][attributeName]] !==
                currentRBSU.Attributes[attribute[key][attributeName]]
            ) {
                tempRBSU.Attributes[
                    attribute[key][attributeName]
                ].CurrentValue =
                    nextRBSU.Attributes[attribute[key][attributeName]];
            } else {
                tempRBSU.Attributes[
                    attribute[key][attributeName]
                ].CurrentValue =
                    currentRBSU.Attributes[attribute[key][attributeName]];
            }
        }

        var dependency = registry.RegistryEntries.Dependencies;
        for (key in dependency) {
            var mapFrom = dependency[key].Dependency.MapFrom,
                evalStr = '';
            for (var index in mapFrom) {
                //Constructing eval string
                var obj = mapFrom[index];
                if (obj.MapFromAttribute in tempRBSU.Attributes) {
                    evalStr += _create_conditional_statement(obj);
                }
            }
            var check = false;
            try {
                check = eval(evalStr);
            } catch (err) {
                console.error('[Invalid parser rule]' + evalStr);
                continue;
            }
            if (check) {
                var mapTo = dependency[key].Dependency,
                    tmpValue,
                    checkStr = null;
                if (typeof mapTo.MapToValue === 'string') {
                    tmpValue = `"${mapTo.MapToValue}"`;
                } else {
                    tmpValue = `${mapTo.MapToValue}`;
                }
                if (tempRBSU.Attributes[mapTo.MapToAttribute]) {
                    checkStr = `tempRBSU.Attributes["${
                        mapTo.MapToAttribute
                    }"]["${mapTo.MapToProperty}"] === ${tmpValue}`;
                } else {
                    var menuObj = registry.RegistryEntries.Menus;
                    for (index in menuObj) {
                        if (menuObj[index][menuName] === mapTo.MapToAttribute) {
                            checkStr = `menuObj[${index}]["${
                                mapTo.MapToProperty
                            }"] === ${tmpValue}`;
                        }
                    }
                }
                if (!checkStr) {
                    console.error(
                        'Attribute not found: ' + mapTo.MapToAttribute
                    );
                    continue;
                }
                try {
                    var actionStr = checkStr.replace('===', '='),
                        force = false;
                    if (
                        tempRBSU.Attributes[mapTo.MapToAttribute] &&
                        mapTo.MapToProperty === 'CurrentValue'
                    ) {
                        if (
                            tempRBSU.Attributes[mapTo.MapToAttribute]
                                .CurrentValue
                        ) {
                            force = true;
                        }
                    }
                    if (!eval(checkStr)) {
                        returnData.modified.push({
                            type: tempRBSU.Attributes[mapTo.MapToAttribute]
                                ? 'Attributes'
                                : 'Menus',
                            name: mapTo.MapToAttribute,
                            attribute: mapTo.MapToProperty,
                            value: mapTo.MapToValue,
                            force: force,
                            why: mapFrom,
                        });
                        eval(actionStr);
                    }
                } catch (err) {
                    console.error('eval error, check string: ' + checkStr);
                    console.error('eval error, action string: ' + checkStr);
                }
            }
        }
        for (key in tempRBSU.Attributes) {
            returnData.RBSU[key] = tempRBSU.Attributes[key].CurrentValue;
        }
        returnData.registry = registry;
        return returnData;
    }
    updateRBSU(registry, currentRBSU, nextRBSU) {
        var data = this.validateRBSU(registry, currentRBSU, nextRBSU);
        var result = isViolating(data);
        if (result) {
            throw result;
        } else {
            nextRBSU.Attributes = data.RBSU;
            return rbsu.client.patch(
                getSettingsURI(currentRBSU),
                _patchData(nextRBSU, rbsu.gen9)
            );
        }
    }
    addPassword(password) {
        return rbsu.client.setBiosPassword(password);
    }
    changePassword(rbsuData, oldPassword, newPassword) {
        var passwordURL = null;
        if (rbsuData && rbsuData.Actions) {
            if (rbsuData.Actions['#Bios.ChangePasswords']) {
                passwordURL = rbsuData.Actions['#Bios.ChangePasswords'].target;
            }
        }
        return passwordURL
            ? rbsu.client
                  .patch(passwordURL, {
                      PasswordName: 'Administrator',
                      OldPassword: oldPassword,
                      NewPassword: newPassword,
                  })
                  .then(function() {
                      rbsu.client.setBiosPassword(newPassword);
                      return true;
                  })
            : null;
    }
    reset(rbsuData) {
        var resetURI = null;
        if (rbsuData && rbsuData.Actions) {
            if (rbsuData.Actions['#Bios.ResetBios']) {
                resetURI = rbsuData.Actions['#Bios.ResetBios'].target;
            }
        }
        return resetURI
            ? rbsu.client
                  .post(resetURI, {
                      ResetType: 'default',
                  })
                  .then(function(res) {
                      return res.body;
                  })
            : null;
    }
}

export { rbsu };
