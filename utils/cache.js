// Simple in-memory cache with TTL (Time To Live)
class Cache {
    constructor() {
      this.cache = new Map();
      this.timestamps = new Map();
    }
  
    // Set cache with TTL in seconds
    set(key, value, ttlSeconds = 3600) {
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      
      this.cache.set(key, {
        value: value,
        expiresAt: expiresAt
      });
      
      this.timestamps.set(key, new Date().toISOString());
      
      console.log(`💾 Cache SET: ${key} (expires in ${ttlSeconds}s)`);
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
      
      console.log(`✅ Cache HIT: ${key}`);
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
  }
  
  // Create singleton instance
  const cache = new Cache();
  
  module.exports = cache;