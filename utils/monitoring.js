/**
 * Monitoring utilities for XPR Token Transfer CLI
 * 
 * This module provides monitoring and observability features:
 * - Health checks for system components
 * - Metrics collection and reporting
 * - Alerting and notifications
 * - System status monitoring
 * 
 * @author XPR Network Developer Examples
 * @version 1.0.0
 */

const { logger } = require('./logger');
const { getPerformanceStats } = require('./performance');

/**
 * Health Check System
 * Monitors the health of various system components
 */
class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.checkInterval = 30000; // 30 seconds
    this.intervalId = null;
    this.status = {
      overall: 'unknown',
      checks: {},
      lastUpdate: null,
      uptime: Date.now()
    };
  }

  /**
   * Add a health check
   * @param {string} name - Check name
   * @param {Function} checkFunction - Function that returns health status
   * @param {Object} options - Check options
   */
  addCheck(name, checkFunction, options = {}) {
    this.checks.set(name, {
      function: checkFunction,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      description: options.description || `Health check for ${name}`
    });
  }

  /**
   * Run a specific health check
   * @param {string} name - Check name
   * @returns {Object} Check result
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      return {
        name,
        status: 'unknown',
        error: 'Check not found',
        timestamp: new Date().toISOString()
      };
    }

    const startTime = Date.now();
    
    try {
      // Run check with timeout
      const result = await Promise.race([
        check.function(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Check timeout')), check.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      return {
        name,
        status: result.status || 'healthy',
        message: result.message || 'Check passed',
        responseTime,
        timestamp: new Date().toISOString(),
        details: result.details || {}
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        status: 'unhealthy',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run all health checks
   * @returns {Object} Overall health status
   */
  async runAllChecks() {
    const results = {};
    let overallStatus = 'healthy';
    let criticalFailures = 0;

    for (const [name, check] of this.checks) {
      const result = await this.runCheck(name);
      results[name] = result;

      if (result.status === 'unhealthy') {
        if (check.critical) {
          overallStatus = 'critical';
          criticalFailures++;
        } else if (overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }
    }

    this.status = {
      overall: overallStatus,
      checks: results,
      lastUpdate: new Date().toISOString(),
      uptime: Date.now() - this.status.uptime,
      criticalFailures
    };

    return this.status;
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(async () => {
      try {
        await this.runAllChecks();
        logger.debug('Health checks completed', { status: this.status.overall });
      } catch (error) {
        logger.error('Health check failed:', error.message);
      }
    }, this.checkInterval);

    logger.info(`Started periodic health checks (interval: ${this.checkInterval}ms)`);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped periodic health checks');
    }
  }

  /**
   * Get current health status
   * @returns {Object} Current health status
   */
  getStatus() {
    return this.status;
  }
}

/**
 * Metrics Collector
 * Collects and aggregates system metrics
 */
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.startTime = Date.now();
  }

  /**
   * Increment a counter
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by
   * @param {Object} labels - Metric labels
   */
  incrementCounter(name, value = 1, labels = {}) {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Set a gauge value
   * @param {string} name - Metric name
   * @param {number} value - Gauge value
   * @param {Object} labels - Metric labels
   */
  setGauge(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  /**
   * Record a histogram value
   * @param {string} name - Metric name
   * @param {number} value - Value to record
   * @param {Object} labels - Metric labels
   */
  recordHistogram(name, value, labels = {}) {
    const key = this.getMetricKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key).push(value);
  }

  /**
   * Get metric key with labels
   * @param {string} name - Metric name
   * @param {Object} labels - Metric labels
   * @returns {string} Metric key
   */
  getMetricKey(name, labels) {
    const labelStr = Object.keys(labels)
      .sort()
      .map(key => `${key}=${labels[key]}`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  /**
   * Get all metrics
   * @returns {Object} All collected metrics
   */
  getAllMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: Object.fromEntries(this.histograms),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = Date.now();
  }
}

/**
 * Alert Manager
 * Manages alerts and notifications
 */
class AlertManager {
  constructor() {
    this.alerts = new Map();
    this.alertRules = new Map();
    this.notificationChannels = new Map();
  }

  /**
   * Add an alert rule
   * @param {string} name - Alert rule name
   * @param {Function} condition - Condition function
   * @param {Object} options - Alert options
   */
  addAlertRule(name, condition, options = {}) {
    this.alertRules.set(name, {
      condition,
      severity: options.severity || 'warning',
      description: options.description || `Alert rule: ${name}`,
      cooldown: options.cooldown || 300000, // 5 minutes
      lastTriggered: 0
    });
  }

  /**
   * Add a notification channel
   * @param {string} name - Channel name
   * @param {Function} notifier - Notification function
   */
  addNotificationChannel(name, notifier) {
    this.notificationChannels.set(name, notifier);
  }

  /**
   * Check alert conditions
   * @param {Object} metrics - Current metrics
   */
  async checkAlerts(metrics) {
    for (const [name, rule] of this.alertRules) {
      try {
        const shouldAlert = await rule.condition(metrics);
        const now = Date.now();
        
        if (shouldAlert && (now - rule.lastTriggered) > rule.cooldown) {
          await this.triggerAlert(name, rule, metrics);
          rule.lastTriggered = now;
        }
      } catch (error) {
        logger.error(`Alert rule ${name} failed:`, error.message);
      }
    }
  }

  /**
   * Trigger an alert
   * @param {string} name - Alert name
   * @param {Object} rule - Alert rule
   * @param {Object} metrics - Current metrics
   */
  async triggerAlert(name, rule, metrics) {
    const alert = {
      name,
      severity: rule.severity,
      description: rule.description,
      timestamp: new Date().toISOString(),
      metrics: this.filterRelevantMetrics(metrics, name)
    };

    this.alerts.set(name, alert);
    logger.warn(`Alert triggered: ${name}`, alert);

    // Send notifications
    for (const [channelName, notifier] of this.notificationChannels) {
      try {
        await notifier(alert);
      } catch (error) {
        logger.error(`Notification channel ${channelName} failed:`, error.message);
      }
    }
  }

  /**
   * Filter relevant metrics for alert
   * @param {Object} metrics - All metrics
   * @param {string} alertName - Alert name
   * @returns {Object} Filtered metrics
   */
  filterRelevantMetrics(metrics, alertName) {
    // Simple filtering - can be enhanced based on alert type
    return {
      performance: metrics.performance,
      health: metrics.health,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get active alerts
   * @returns {Array} Active alerts
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values());
  }

  /**
   * Clear an alert
   * @param {string} name - Alert name
   */
  clearAlert(name) {
    this.alerts.delete(name);
  }
}

/**
 * System Monitor
 * Main monitoring system that coordinates all monitoring components
 */
class SystemMonitor {
  constructor() {
    this.healthChecker = new HealthChecker();
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.monitoringInterval = 10000; // 10 seconds
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Initialize monitoring system
   */
  initialize() {
    logger.info('Initializing system monitoring...');

    // Add default health checks
    this.addDefaultHealthChecks();

    // Add default alert rules
    this.addDefaultAlertRules();

    // Add default notification channels
    this.addDefaultNotificationChannels();

    logger.info('System monitoring initialized successfully');
  }

  /**
   * Add default health checks
   */
  addDefaultHealthChecks() {
    // Blockchain connectivity check
    this.healthChecker.addCheck('blockchain', async () => {
      try {
        // This would check blockchain connectivity
        // For now, return a mock check
        return {
          status: 'healthy',
          message: 'Blockchain connection active',
          details: { endpoint: 'testnet.protonchain.com' }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: 'Blockchain connection failed',
          error: error.message
        };
      }
    }, { critical: true, timeout: 10000 });

    // Memory usage check
    this.healthChecker.addCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      const isHealthy = memUsageMB.heapUsed < 500; // 500MB limit

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'Memory usage normal' : 'High memory usage',
        details: memUsageMB
      };
    }, { timeout: 1000 });

    // Disk space check
    this.healthChecker.addCheck('disk', async () => {
      // Mock disk check - in real implementation, use fs.stat
      return {
        status: 'healthy',
        message: 'Disk space available',
        details: { freeSpace: '10GB' }
      };
    }, { timeout: 2000 });
  }

  /**
   * Add default alert rules
   */
  addDefaultAlertRules() {
    // High error rate alert
    this.alertManager.addAlertRule('high_error_rate', (metrics) => {
      const errorRate = metrics.performance?.requests?.failed / metrics.performance?.requests?.total;
      return errorRate > 0.1; // 10% error rate threshold
    }, {
      severity: 'critical',
      description: 'High error rate detected',
      cooldown: 300000
    });

    // High response time alert
    this.alertManager.addAlertRule('high_response_time', (metrics) => {
      const avgResponseTime = metrics.performance?.requests?.averageResponseTime;
      return avgResponseTime > 5000; // 5 second threshold
    }, {
      severity: 'warning',
      description: 'High response time detected',
      cooldown: 600000
    });

    // Memory usage alert
    this.alertManager.addAlertRule('high_memory_usage', (metrics) => {
      const memUsage = metrics.health?.checks?.memory?.details?.heapUsed;
      return memUsage > 400; // 400MB threshold
    }, {
      severity: 'warning',
      description: 'High memory usage detected',
      cooldown: 300000
    });
  }

  /**
   * Add default notification channels
   */
  addDefaultNotificationChannels() {
    // Console notification
    this.alertManager.addNotificationChannel('console', (alert) => {
      logger.warn(`ALERT: ${alert.name} - ${alert.description}`, alert);
    });

    // Log file notification
    this.alertManager.addNotificationChannel('logfile', (alert) => {
      logger.error(`ALERT: ${alert.name} - ${alert.description}`, alert);
    });
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.healthChecker.startPeriodicChecks();

    this.intervalId = setInterval(async () => {
      try {
        // Collect metrics
        const performanceStats = getPerformanceStats();
        this.metricsCollector.setGauge('performance_requests_total', performanceStats.monitor?.requests?.total || 0);
        this.metricsCollector.setGauge('performance_requests_successful', performanceStats.monitor?.requests?.successful || 0);
        this.metricsCollector.setGauge('performance_requests_failed', performanceStats.monitor?.requests?.failed || 0);
        this.metricsCollector.setGauge('performance_avg_response_time', performanceStats.monitor?.requests?.averageResponseTime || 0);

        // Check alerts
        const metrics = {
          performance: performanceStats,
          health: this.healthChecker.getStatus()
        };
        await this.alertManager.checkAlerts(metrics);

      } catch (error) {
        logger.error('Monitoring cycle failed:', error.message);
      }
    }, this.monitoringInterval);

    logger.info('System monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.healthChecker.stopPeriodicChecks();

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('System monitoring stopped');
  }

  /**
   * Get monitoring status
   * @returns {Object} Monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      health: this.healthChecker.getStatus(),
      metrics: this.metricsCollector.getAllMetrics(),
      alerts: this.alertManager.getActiveAlerts()
    };
  }

  /**
   * Get health endpoint data
   * @returns {Object} Health endpoint data
   */
  getHealthEndpoint() {
    const status = this.getStatus();
    return {
      status: status.health.overall,
      timestamp: new Date().toISOString(),
      uptime: status.health.uptime,
      version: '1.0.0',
      checks: status.health.checks
    };
  }

  /**
   * Get metrics endpoint data
   * @returns {Object} Metrics endpoint data
   */
  getMetricsEndpoint() {
    return {
      timestamp: new Date().toISOString(),
      ...this.metricsCollector.getAllMetrics(),
      performance: getPerformanceStats()
    };
  }
}

// Global monitoring instance
let systemMonitor = null;

/**
 * Initialize monitoring system
 * @param {Object} config - Configuration object
 */
function initializeMonitoring(config) {
  systemMonitor = new SystemMonitor();
  systemMonitor.initialize();
  
  if (config.monitoring?.enabled !== false) {
    systemMonitor.start();
  }
  
  return systemMonitor;
}

/**
 * Get monitoring instance
 * @returns {SystemMonitor} Monitoring instance
 */
function getMonitoring() {
  return systemMonitor;
}

module.exports = {
  HealthChecker,
  MetricsCollector,
  AlertManager,
  SystemMonitor,
  initializeMonitoring,
  getMonitoring,
};
