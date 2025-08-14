// Enhanced in-memory cache with TTL, size limits, and memory monitoring
class Cache {
    constructor() {
      this.cache = new Map();
      this.timestamps = new Map();
      // Configuration for Render.com free tier (512MB RAM limit)
      this.maxSize = 50; // Maximum number of cache entries
      this.maxMemoryUsage = 100 * 1024 * 1024; // 100MB max cache memory usage
      this.memoryCheckInterval = 300000; // Check memory every 5 minutes
      
      // Start memory monitoring
      this.startMemoryMonitoring();
    }
  
    // Set cache with TTL in seconds and size limits
    set(key, value, ttlSeconds = 3600) {
      // Check memory usage before adding new entries
      if (this.cache.size >= this.maxSize) {
        this.evictOldestEntries(1);
      }
      
      // Estimate memory usage of the new entry
      const estimatedSize = this.estimateMemoryUsage(value);
      const currentMemory = this.getCurrentMemoryUsage();
      
      if (currentMemory + estimatedSize > this.maxMemoryUsage) {
        console.log(`⚠️ Cache memory limit reached, evicting old entries`);
        this.evictByMemoryPressure();
      }
      
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      
      this.cache.set(key, {
        value: value,
        expiresAt: expiresAt,
        size: estimatedSize,
        accessCount: 0,
        lastAccess: Date.now()
      });
      
      this.timestamps.set(key, new Date().toISOString());
      
      console.log(`💾 Cache SET: ${key} (expires in ${ttlSeconds}s, ~${Math.round(estimatedSize/1024)}KB)`);
    }
  
    // Get from cache (returns null if expired or not found)
    get(key) {
      const item = this.cache.get(key);
      
      if (!item) {
        console.log(`📭 Cache MISS: ${key} (not found)`);
        return null;
      }
      
      if (Date.now() > item.expiresAt) {
        // Expired - remove from cache
        this.delete(key);
        console.log(`⏰ Cache EXPIRED: ${key}`);
        return null;
      }
      
      // Update access statistics
      item.accessCount++;
      item.lastAccess = Date.now();
      
      console.log(`✅ Cache HIT: ${key} (accessed ${item.accessCount} times)`);
      return item.value;
    }
  
    // Delete from cache
    delete(key) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      console.log(`🗑️ Cache DELETE: ${key}`);
    }
  
    // Clear all cache
    clear() {
      this.cache.clear();
      this.timestamps.clear();
      console.log(`🧹 Cache CLEARED`);
    }
  
    // Get cache timestamp
    getTimestamp(key) {
      return this.timestamps.get(key);
    }
  
    // Get cache status
    getStatus() {
      return {
        size: this.cache.size,
        keys: Array.from(this.cache.keys()),
        timestamps: Object.fromEntries(this.timestamps)
      };
    }
  
    // Check if key exists and is not expired
    has(key) {
      const item = this.cache.get(key);
      return item && Date.now() <= item.expiresAt;
    }

    // Memory management methods for Render.com optimization
    estimateMemoryUsage(value) {
      // Rough estimation of memory usage in bytes
      return JSON.stringify(value).length * 2; // Unicode characters are ~2 bytes
    }

    getCurrentMemoryUsage() {
      let totalSize = 0;
      for (const [key, item] of this.cache) {
        totalSize += item.size || 0;
      }
      return totalSize;
    }

    evictOldestEntries(count = 5) {
      // Sort by last access time and remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => (a[1].lastAccess || 0) - (b[1].lastAccess || 0));
      
      for (let i = 0; i < Math.min(count, entries.length); i++) {
        const [key] = entries[i];
        this.delete(key);
        console.log(`🧹 Evicted old cache entry: ${key}`);
      }
    }

    evictByMemoryPressure() {
      const currentMemory = this.getCurrentMemoryUsage();
      const targetReduction = currentMemory * 0.3; // Remove 30% of cache memory
      let freedMemory = 0;

      // Sort by access frequency (least used first)
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => (a[1].accessCount || 0) - (b[1].accessCount || 0));

      for (const [key, item] of entries) {
        if (freedMemory >= targetReduction) break;
        
        freedMemory += item.size || 0;
        this.delete(key);
      }

      console.log(`🧹 Memory pressure eviction: freed ~${Math.round(freedMemory/1024)}KB`);
    }

    startMemoryMonitoring() {
      setInterval(() => {
        const processMemory = process.memoryUsage();
        const cacheMemory = this.getCurrentMemoryUsage();
        const memoryMB = Math.round(processMemory.rss / 1024 / 1024);

        if (memoryMB > 400) { // Approaching 512MB limit
          console.log(`⚠️ High memory usage: ${memoryMB}MB (cache: ${Math.round(cacheMemory/1024/1024)}MB)`);
          this.evictByMemoryPressure();
        } else if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Memory status: ${memoryMB}MB (cache: ${Math.round(cacheMemory/1024/1024)}MB)`);
        }
      }, this.memoryCheckInterval);
    }

    // Enhanced status for monitoring
    getStatus() {
      const processMemory = process.memoryUsage();
      const cacheMemory = this.getCurrentMemoryUsage();
      
      return {
        size: this.cache.size,
        maxSize: this.maxSize,
        memoryUsage: `${Math.round(cacheMemory/1024/1024)}MB`,
        processMemory: `${Math.round(processMemory.rss/1024/1024)}MB`,
        keys: Array.from(this.cache.keys()),
        timestamps: Object.fromEntries(this.timestamps)
      };
    }
  }
  
  // Create singleton instance
  const cache = new Cache();
  
  module.exports = cache;