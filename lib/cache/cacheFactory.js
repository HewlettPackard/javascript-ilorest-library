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

if (typeof(WeakMap) === 'undefined') {
    var WeakMap = require('weakmap');
}

var _p = new WeakMap();
var caches = {};

class lruCache {
    constructor (cacheId, options) {
        var privateProperties = {
            size: 0,
            stats: Object.assign({}, options, {id: cacheId}),
            data: {},
            capacity: (options && options.capacity) || Number.MAX_VALUE,
            lruHash: {},
            freshEnd: null,
            staleEnd: null
        };
        _p.set(this, privateProperties);
    }
    put (key, value) {
        var size, capacity, lruHash, data;
        if (value === undefined) {
            return;
        }
        size = _p.get(this).size;
        capacity = _p.get(this).capacity;
        lruHash = _p.get(this).lruHash;
        data = _p.get(this).data;

        if (capacity < Number.MAX_VALUE) {
            let lruEntry = lruHash[key] || (lruHash[key] = {key: key});
            this.__refresh(lruEntry);
        }
        if (!(key in data)) {
            _p.get(this).size = ++size;
        }

        data[key] = value;
        
        if (size > capacity)  {
            this.remove(_p.get(this).staleEnd.key);
        }
        return value;
    }
    get (key) {
        var capacity = _p.get(this).capacity;

        if (capacity < Number.MAX_VALUE) {
            let lruEntry = _p.get(this).lruHash[key];
            if (!lruEntry) {
                return;
            }
            this.__refresh(lruEntry);
        }

        return _p.get(this).data[key];
    }
    remove (key) {
        var capacity = _p.get(this).capacity,
            size = _p.get(this).size,
            lruHash = _p.get(this).lruHash,
            data = _p.get(this).data;

        if (capacity < Number.MAX_VALUE) {
            let lruEntry = lruHash[key];

            if (!lruEntry) {
                return;
            }

            if (lruEntry === _p.get(this).freshEnd) {
                _p.get(this).freshEnd = lruEntry.p;
            }
            if (lruEntry === _p.get(this).staleEnd) {
                _p.get(this).staleEnd = lruEntry.n;
            }
            this.__link(lruEntry.n, lruEntry.p);

            delete lruHash[key];  // Call by reference
        }

        delete data[key];  // Call by reference
        _p.get(this).size = --size;
    }
    removeAll () {
        _p.get(this).data = {};
        _p.get(this).size = 0;
        _p.get(this).lruHash = {};
        _p.get(this).freshEnd = null;
        _p.get(this).staleEnd = null;
    }
    destroy () {
        _p.get(this).data = null;
        _p.get(this).stats = null;
        _p.get(this).lruHash = null;
        delete caches[this.cacheId];
    }
    info () {
        return Object.assign({}, _p.get(this).stats, {size: _p.get(this).size});
    }
    __refresh (entry) {
        var freshEnd = _p.get(this).freshEnd,
            staleEnd = _p.get(this).staleEnd;

        if (entry !== freshEnd) {
            if (!staleEnd) {
                _p.get(this).staleEnd = entry;
            }
            else if (staleEnd === entry) {
                _p.get(this).staleEnd = entry.n;
            }

            this.__link(entry.n, entry.p);
            this.__link(entry, freshEnd);
            entry.n = null;
            _p.get(this).freshEnd = entry;
        }
    }
    __link (nextEntry, prevEntry) {
        if (nextEntry !== prevEntry) {
            if (nextEntry) {
                nextEntry.p = prevEntry;
            }
            if (prevEntry) {
                prevEntry.n = nextEntry;
            }
        }
    }
}


// TODO:
class fileCache extends lruCache {
    constructor (cacheId, options) {
        super(cacheId, options);
    }
}


export class cacheFactory {
    constructor() {
    }
    static get (cacheId) {
        return caches[cacheId];
    }
    static create (cacheId, options=null) {
        if (!(cacheId in caches)) {
            let type = (options && options.type) ? options.type : 'ramCache';
            caches[cacheId] = new this.mapping[type](cacheId, options);
            return caches[cacheId];
        }
        return;
    }
    static info () {
        var info = {};

        for (let id in caches) {
            if (caches.hasOwnProperty(id)) {
                info[id] = caches[id].info();
            }
        }
        return info;
    }
}

cacheFactory.RAMCACHE = 'ramCache';
cacheFactory.FILECACHE = 'fileCache';
cacheFactory.mapping = {
    ramCache: lruCache,
    fileCache: fileCache
};
