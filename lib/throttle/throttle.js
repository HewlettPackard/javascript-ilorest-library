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

var promise = require('bluebird');

export class throttle {
    constructor (MAX) {
        (typeof(MAX)=== 'number' && MAX > 0)? this.MAX = MAX : this.MAX = 1;
        this.queue = [];
        this.count = 0;
    }
    _deferObj(callback) {
        var _value = callback;
        var _resolve, _reject;
        var _promise = new promise(function(resolve, reject) {
            _resolve = resolve;
            _reject = reject;
        });
        return {
            getPromise: function() {
                return _promise;
            },
            start: function() {
                _resolve(_value);
                return _promise;
            },
            cancel: function() {
                _reject(_value);
                return _promise;
            }
        };
    }
    _throttling (deferal) {
        this.queue.push(deferal);
        while (this.count < this.MAX) {
            var obj = this.queue.shift();
            if (obj) {
                this.count += 1;
                obj.start();
            } else {
                break;
            }
        }
    }
    _startNext () {
        this.count -= 1;
        var obj = this.queue.shift();
        if (obj) {
            this.count += 1;
            obj.start();
        }
    }
    run(callback){
        var deferal = this._deferObj(callback);
        var originalPromise = {};
        this._throttling(deferal);
        return deferal.getPromise().then((callback) => {
            originalPromise = callback();
            return originalPromise;
        }).then(() => {
            this._startNext();
            return originalPromise;
        }).catch((err) => {
            this._startNext();
            throw err;
        });
    }
}
