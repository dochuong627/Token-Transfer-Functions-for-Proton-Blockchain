/**
 * Performance utilities for XPR Token Transfer CLI
 * 
 * This module provides performance optimization features:
 * - Connection pooling for blockchain RPC calls
 * - Caching for frequently accessed data
 * - Request batching and optimization
 * - Performance monitoring and metrics
 * 
 * @author XPR Network Developer Examples
 * @version 1.0.0
 */

const { logger } = require('./logger');

/**
 * Connection Pool for RPC calls
 * Manages multiple connections to blockchain nodes for better performance
 */
class ConnectionPool {
  constructor(endpoints, maxConnections = 5) {
    this.endpoints = Array.isArray(endpoints) ? endpoints : [endpoints];
    this.maxConnections = maxConnections;
    this.connections = [];
    this.availableConnections = [];
    this.busyConnections = new Set();
    this.connectionStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Initialize connection pool
   */
  async initialize() {
    logger.info(`Initializing connection pool with ${this.endpoints.length} endpoints`);
    
    for (let i = 0; i < Math.min(this.maxConnections, this.endpoints.length); i++) {
      const endpoint = this.endpoints[i % this.endpoints.length];
      const connection = {
        id: i,
        endpoint: endpoint,
        lastUsed: Date.now(),
        requestCount: 0,
        isHealthy: true
      };
      
      this.connections.push(connection);
      this.availableConnections.push(connection);
    }
    
    logger.info(`Connection pool initialized with ${this.connections.length} connections`);
  }

  /**
   * Get an available connection
   * @returns {Object} Available connection
   */
  getConnection() {
    if (this.availableConnections.length === 0) {
      // All connections are busy, wait for one to become available
      return null;
    }
    
    const connection = this.availableConnections.shift();
    this.busyConnections.add(connection);
    connection.lastUsed = Date.now();
    
    return connection;
  }

  /**
   * Release a connection back to the pool
   * @param {Object} connection - Connection to release
   */
  releaseConnection(connection) {
    if (this.busyConnections.has(connection)) {
      this.busyConnections.delete(connection);
      this.availableConnections.push(connection);
    }
  }

  /**
   * Mark connection as unhealthy
   * @param {Object} connection - Connection to mark as unhealthy
   */
  markUnhealthy(connection) {
    connection.isHealthy = false;
    this.busyConnections.delete(connection);
    
    // Remove from available connections
    const index = this.availableConnections.indexOf(connection);
    if (index > -1) {
      this.availableConnections.splice(index, 1);
    }
    
    logger.warn(`Connection ${connection.id} marked as unhealthy`);
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool statistics
   */
  getStats() {
    return {
      totalConnections: this.connections.length,
      availableConnections: this.availableConnections.length,
      busyConnections: this.busyConnections.size,
      unhealthyConnections: this.connections.filter(c => !c.isHealthy).length,
      stats: this.connectionStats
    };
  }
}

/**
 * Cache for frequently accessed data
 * Implements TTL (Time To Live) and LRU (Least Recently Used) eviction
 */
class Cache {
  constructor(maxSize = 1000, defaultTTL = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.accessTimes = new Map();
    this.expirationTimes = new Map();
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.accessTimes.set(key, Date.now());
    this.expirationTimes.set(key, Date.now() + ttl);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  get(key) {
    // Check if key exists and is not expired
    if (!this.cache.has(key)) {
      return null;
    }

    const expirationTime = this.expirationTimes.get(key);
    if (Date.now() > expirationTime) {
      this.delete(key);
      return null;
    }

    // Update access time
    this.accessTimes.set(key, Date.now());
    return this.cache.get(key);
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
    this.expirationTimes.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.expirationTimes.clear();
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Calculate cache hit rate
   * @returns {number} Hit rate percentage
   */
  calculateHitRate() {
    // This would need to be implemented with request tracking
    return 0; // Placeholder
  }

  /**
   * Estimate memory usage
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(value).length * 2;
    }
    return totalSize;
  }
}

/**
 * Request Batcher
 * Groups multiple requests together for better performance
 */
class RequestBatcher {
  constructor(batchSize = 10, batchTimeout = 100) {
    this.batchSize = batchSize;
    this.batchTimeout = batchTimeout;
    this.pendingRequests = [];
    this.batchTimer = null;
  }

  /**
   * Add request to batch
   * @param {Function} request - Request function
   * @returns {Promise} Request result
   */
  async addRequest(request) {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ request, resolve, reject });

      // Process batch if it's full
      if (this.pendingRequests.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimer) {
        // Set timer for batch timeout
        this.batchTimer = setTimeout(() => {
          this.processBatch();
        }, this.batchTimeout);
      }
    });
  }

  /**
   * Process pending batch
   */
  async processBatch() {
    if (this.pendingRequests.length === 0) {
      return;
    }

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get current batch
    const batch = this.pendingRequests.splice(0, this.batchSize);
    
    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        batch.map(item => item.request())
      );

      // Resolve/reject each promise
      results.forEach((result, index) => {
        const { resolve, reject } = batch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all requests in case of batch failure
      batch.forEach(({ reject }) => reject(error));
    }
  }
}

/**
 * Performance Monitor
 * Tracks and reports performance metrics
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      connections: {
        active: 0,
        total: 0,
        errors: 0
      }
    };
    this.responseTimes = [];
    this.maxResponseTimeHistory = 100;
  }

  /**
   * Record a request
   * @param {number} responseTime - Response time in milliseconds
   * @param {boolean} success - Whether request was successful
   */
  recordRequest(responseTime, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track response times
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }

    // Calculate average response time
    this.metrics.requests.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
  }

  /**
   * Record cache hit
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss() {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  updateCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      responseTimeStats: {
        min: Math.min(...this.responseTimes),
        max: Math.max(...this.responseTimes),
        average: this.metrics.requests.averageResponseTime,
        p95: this.calculatePercentile(95),
        p99: this.calculatePercentile(99)
      }
    };
  }

  /**
   * Calculate percentile
   * @param {number} percentile - Percentile to calculate
   * @returns {number} Percentile value
   */
  calculatePercentile(percentile) {
    if (this.responseTimes.length === 0) return 0;
    
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0 },
      connections: { active: 0, total: 0, errors: 0 }
    };
    this.responseTimes = [];
  }
}

/**
 * Performance optimization wrapper
 * Wraps functions with performance monitoring and caching
 */
function withPerformanceMonitoring(fn, options = {}) {
  const {
    cacheKey = null,
    cacheTTL = 300000, // 5 minutes
    enableCaching = false
  } = options;

  return async function(...args) {
    const startTime = Date.now();
    let result;
    let success = true;

    try {
      // Check cache first
      if (enableCaching && cacheKey) {
        const cached = global.performanceCache?.get(cacheKey);
        if (cached) {
          global.performanceMonitor?.recordCacheHit();
          return cached;
        }
        global.performanceMonitor?.recordCacheMiss();
      }

      // Execute function
      result = await fn.apply(this, args);

      // Cache result
      if (enableCaching && cacheKey) {
        global.performanceCache?.set(cacheKey, result, cacheTTL);
      }

    } catch (error) {
      success = false;
      throw error;
    } finally {
      // Record performance metrics
      const responseTime = Date.now() - startTime;
      global.performanceMonitor?.recordRequest(responseTime, success);
    }

    return result;
  };
}

// Global instances
let connectionPool = null;
let performanceCache = null;
let performanceMonitor = null;
let requestBatcher = null;

/**
 * Initialize performance utilities
 * @param {Object} config - Configuration object
 */
function initializePerformance(config) {
  logger.info('Initializing performance utilities...');

  // Initialize connection pool
  if (config.blockchain?.endpoints) {
    connectionPool = new ConnectionPool(config.blockchain.endpoints, config.performance?.maxConnections || 5);
    connectionPool.initialize();
  }

  // Initialize cache
  performanceCache = new Cache(
    config.performance?.cacheSize || 1000,
    config.performance?.cacheTTL || 300000
  );

  // Initialize performance monitor
  performanceMonitor = new PerformanceMonitor();

  // Initialize request batcher
  requestBatcher = new RequestBatcher(
    config.performance?.batchSize || 10,
    config.performance?.batchTimeout || 100
  );

  // Make instances globally available
  global.connectionPool = connectionPool;
  global.performanceCache = performanceCache;
  global.performanceMonitor = performanceMonitor;
  global.requestBatcher = requestBatcher;

  logger.info('Performance utilities initialized successfully');
}

/**
 * Get performance statistics
 * @returns {Object} Performance statistics
 */
function getPerformanceStats() {
  return {
    connectionPool: connectionPool?.getStats(),
    cache: performanceCache?.getStats(),
    monitor: performanceMonitor?.getMetrics()
  };
}

module.exports = {
  ConnectionPool,
  Cache,
  RequestBatcher,
  PerformanceMonitor,
  withPerformanceMonitoring,
  initializePerformance,
  getPerformanceStats,
};
