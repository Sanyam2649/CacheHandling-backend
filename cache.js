const readline = require('readline');
const { Mutex } = require('async-mutex');

class CacheLevel {
    constructor(size, evictionPolicy) {
        this.size = size;
        this.evictionPolicy = evictionPolicy;
        this.cache = new Map(); // For LRU: maintains order of access
        this.accessCount = new Map(); // For LFU
        this.mutex = new Mutex();
        this.lowerCache = null; // To hold reference to lower cache level
    }

    async setLowerCache(lowerCache) {
        this.lowerCache = lowerCache;
    }

    async get(key) {
        const release = await this.mutex.acquire();
        try {
            if (!this.cache.has(key)) {
                // If not found in current level, check lower cache
                if (this.lowerCache) {
                    const lowerValue = await this.lowerCache.get(key);
                    if (lowerValue) {
                        // Move it to the higher cache level
                        await this.put(key, lowerValue);
                        return lowerValue;
                    }
                }
                return null;
            }

            const value = this.cache.get(key);

            if (this.evictionPolicy === 'LRU') {
                // Update LRU order
                this.cache.delete(key);
                this.cache.set(key, value); // Reinsert to update position
            } else if (this.evictionPolicy === 'LFU') {
                // Update access count for LFU
                this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
            }

            return value;
        } finally {
            release();
        }
    }

    // Put function
    async put(key, value) {
        const release = await this.mutex.acquire();
        try {
            if (this.cache.size >= this.size) {
                const evictedItem = await this.evict();
                if (evictedItem && this.lowerCache) {
                    // Pass evicted item to lower cache
                    await this.lowerCache.put(evictedItem.key, evictedItem.value);
                }
            }
            this.cache.set(key, value);
            if (this.evictionPolicy === 'LFU') {
                this.accessCount.set(key, this.accessCount.get(key) || 0);
            }
        } finally {
            release();
        }
    }

    async evict() {
        if (this.evictionPolicy === 'LRU') {
            // Remove the oldest item
            const oldestKey = this.cache.keys().next().value;
            const value = this.cache.get(oldestKey);
            this.cache.delete(oldestKey);
            return { key: oldestKey, value };
        } else if (this.evictionPolicy === 'LFU') {
            let leastFrequentKey = null;
            let minFrequency = Infinity;
            for (let [key, freq] of this.accessCount) {
                if (freq < minFrequency) {
                    minFrequency = freq;
                    leastFrequentKey = key;
                }
            }
            if (leastFrequentKey) {
                const value = this.cache.get(leastFrequentKey);
                this.cache.delete(leastFrequentKey);
                this.accessCount.delete(leastFrequentKey);
                return { key: leastFrequentKey, value };
            }
        }
        return null;
    }

    async display() {
        const release = await this.mutex.acquire();
        try {
            const entries = [];
            for (const [key, value] of this.cache) {
                entries.push(`${key}: ${value}`);
            }
            return `[${entries.join(', ')}]`;
        } finally {
            release();
        }
    }
}


class MultiLevelCache {
    constructor() {
        this.cacheLevels = [];
    }

    addCacheLevel(size, evictionPolicy) {
        if (evictionPolicy !== 'LRU' && evictionPolicy !== 'LFU') {
            throw new Error('Eviction policy must be LRU or LFU');
        }
        const newCacheLevel = new CacheLevel(size, evictionPolicy);
        if (this.cacheLevels.length > 0) {
            this.cacheLevels[this.cacheLevels.length - 1].setLowerCache(newCacheLevel);
        }
        this.cacheLevels.push(newCacheLevel);
    }

    async get(key) {
        for (let i = 0; i < this.cacheLevels.length; i++) {
            const value = await this.cacheLevels[i].get(key);
            if (value !== null) {
                // Move data to higher levels
                for (let j = i - 1; j >= 0; j--) {
                    await this.cacheLevels[j].put(key, value);
                }
                return value;
            }
        }
        // Fetch from main memory if not found in any cache
        return this.fetchFromMainMemory(key);
    }

    async put(key, value) {
        await this.cacheLevels[0].put(key, value);
    }

    async removeCacheLevel(level) {
        if (level >= 0 && level < this.cacheLevels.length) {
            this.cacheLevels.splice(level, 1);
            
            for (let i = level; i < this.cacheLevels.length; i++) {
                if (i < this.cacheLevels.length - 1) {
                    this.cacheLevels[i].setLowerCache(this.cacheLevels[i + 1]);
                } else {
                    this.cacheLevels[i].setLowerCache(null);
                }
            }
        } else {
            throw new Error('Invalid cache level index');
        }
    }

    async displayCache() {
        for (let i = 0; i < this.cacheLevels.length; i++) {
            const cacheLevel = this.cacheLevels[i];
            const output = `${i === 0 ? 'L1' : `L${i + 1}`} Cache: ${await cacheLevel.display()}`;
            console.log(output);
        }
    }

    async fetchFromMainMemory(key) {
        const value = `data for ${key}`;
        await this.put(key, value);
        return value;
    }
}


// Command-line interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const cache = new MultiLevelCache();

function promptUser() {
    rl.question('Enter command (addCacheLevel, get, put, removeCacheLevel, displayCache, quit): ', async (command) => {
        const [cmd, ...args] = command.split(' ');
        try {
            switch (cmd) {
                case 'addCacheLevel':
                    if (args.length !== 2) {
                        console.log('Usage: addCacheLevel <size> <evictionPolicy>');
                        break;
                    }
                    const size = parseInt(args[0]);
                    const evictionPolicy = args[1];
                    if (isNaN(size) || !['LRU', 'LFU'].includes(evictionPolicy)) {
                        console.log('Invalid size or eviction policy');
                        break;
                    }
                    cache.addCacheLevel(size, evictionPolicy);
                    console.log(`Cache level added: Size ${size}, Policy ${evictionPolicy}`);
                    break;

                case 'get':
                    if (args.length !== 1) {
                        console.log('Usage: get <key>');
                        break;
                    }
                    const key = args[0];
                    const result = await cache.get(key);
                    console.log(`Value for key '${key}': ${result || 'null'}`);
                    break;

                case 'put':
                    if (args.length !== 2) {
                        console.log('Usage: put <key> <value>');
                        break;
                    }
                    const putKey = args[0];
                    const value = args[1];
                    await cache.put(putKey, value);
                    console.log(`Inserted: ${putKey} => ${value}`);
                    break;

                case 'removeCacheLevel':
                    if (args.length !== 1) {
                        console.log('Usage: removeCacheLevel <level>');
                        break;
                    }
                    const level = parseInt(args[0]);
                    if (isNaN(level)) {
                        console.log('Invalid cache level');
                        break;
                    }
                    await cache.removeCacheLevel(level);
                    console.log(`Cache level removed: ${level}`);
                    break;

                case 'displayCache':
                    await cache.displayCache();
                    break;

                case 'quit':
                    rl.close();
                    return;

                default:
                    console.log('Unknown command');
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
        promptUser(); 
    });
}

promptUser();
