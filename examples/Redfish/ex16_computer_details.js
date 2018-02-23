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

var MODULE = '../../dist';
var SERVER = process.env.SERVER; // 'https://10.10.10.10'
var USER   = process.env.USER;   // 'username'
var PASS   = process.env.PASS;   // 'pa55w0rd'

var rest = require(MODULE);
var client = rest.redfishClient(SERVER);

console.log('Client initialized');

client.login(USER, PASS)
    .then((res) => {
        console.log('Login');
        return res;
    })
    .catch((err) => {
        console.log('\n  Login Failed\n');
        throw err;
    })

    .then(() => {
        var rdUrl = client.root.Oem.Hpe.Links.ResourceDirectory['@odata.id'];
        return client.get(rdUrl).catch((err) => {
            console.log('\n  Get ResourceDirectory Failed\n');
            throw err;
        });
    })

    .then((res) => {
        var uri, itemUri, itemType;
        for (let item of res.body.Instances) {
            itemType = item['@odata.type'];
            itemUri = item['@odata.id'];
            if(itemType && itemType.startsWith('#ComputerSystem.')) {
                uri = itemUri;
            }
        }        
        if (!uri) { throw('ERROR: Type not found'); }

        return client.get(uri).catch((err) => {
            console.log('\n  Get Computer System Failed\n');
            throw err;
        });
    })

	.then((res) => {
		console.log('EXAMPLE 16: Dump host computer details');
		console.log('Manufacturer: ' + res.body['Manufacturer']);
		console.log('Model: ' + res.body['Model']);
		console.log('Serial Number: ' + res.body['SerialNumber']);

		if (res.body['VirtualSerialNumber'])
			console.log('Virtual Serial Number: ' + res.body['VirtualSerialNumber']);
		else
			console.log('Virtual Serial Number information not available on system resource');

		console.log('UUID: ' + res.body['UUID']);

		if (res.body['Oem']['Hp']['VirtualUUID'])
			console.log('VirtualUUID: ' + res.body['Oem']['Hp']['VirtualUUID']);
		else
			console.log('VirtualUUID not available on system resource');

		if (res.body['AssetTag'])
			console.log('Asset Tag: ' + res.body['AssetTag']);
		else
			console.log('No Asset Tag information on system resource');

		console.log('BIOS Version: ' + res.body['BiosVersion']);
		console.log('Memory: ' + res.body['MemorySummary']['TotalSystemMemoryGiB'] + ' GB');
		console.log('Processors: ' + res.body['ProcessorSummary']['Count'] + ' x ' + res.body['ProcessorSummary']['Model']);

		if (res.body['Status'] && res.body['Status']['Health'])
			console.log('Health: ' + res.body['Status']['Health']);
		else
			console.log('Status/Health information not available in system resource');

		if (res.body['HostCorrelation']) {
			if (res.body['HostCorrelation']['HostFQDN'])
				console.log('Host FQDN: ' + res.body['HostCorrelation']['HostFQDN']);
			if (res.body['HostCorrelation']['HostMACAddress'])
				for (let mac of res.body['HostCorrelation']['HostMACAddress'])
					console.log('Host MAC Address: ' + mac);
			if (res.body['HostCorrelation']['HostName'])
				console.log('Host Name: ' + res.body['HostCorrelation']['HostName']);
			if (res.body['HostCorrelation']['IPAddress'])
				for (let ip_address of res.body['HostCorrelation']['IPAddress'])
					if (ip_address)
						console.log('Host IP Address: ' + ip_address);
		}
	})

    .catch((err) => {
        if (err.constructor.name === 'StatusCodeError') {
            console.log('\n' + err.error.error['@Message.ExtendedInfo'][0].MessageId + '\n');
        }
        else {
            console.log(err);
        }
    })

    .finally(() => {
        console.log('Logout');
        return client.logout();
    })
     .catch((err) => {
        console.log(err);
    });
