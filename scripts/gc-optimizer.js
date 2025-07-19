// Garbage Collection Optimizer for MechaMap Realtime Server
const v8 = require('v8');

class GCOptimizer {
  constructor(options = {}) {
    this.gcInterval = options.gcInterval || 30000; // 30 seconds
    this.memoryThreshold = options.memoryThreshold || 0.8; // 80%
    this.forceGCThreshold = options.forceGCThreshold || 0.9; // 90%
    this.logger = options.logger || console;
    
    this.startMonitoring();
  }
  
  startMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
    }, this.gcInterval);
    
    this.logger.info('🧹 GC Optimizer started', {
      gcInterval: this.gcInterval,
      memoryThreshold: this.memoryThreshold,
      forceGCThreshold: this.forceGCThreshold
    });
  }
  
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    const totalHeapPercent = heapStats.used_heap_size / heapStats.heap_size_limit;
    
    if (heapUsagePercent > this.forceGCThreshold || totalHeapPercent > this.forceGCThreshold) {
      this.forceGarbageCollection();
    } else if (heapUsagePercent > this.memoryThreshold) {
      this.suggestGarbageCollection();
    }
    
    // Log memory stats every 5 minutes
    if (Date.now() % 300000 < this.gcInterval) {
      this.logMemoryStats();
    }
  }
  
  forceGarbageCollection() {
    const beforeGC = process.memoryUsage();
    
    if (global.gc) {
      global.gc();
      const afterGC = process.memoryUsage();
      const freed = (beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024;
      
      this.logger.info('🧹 Forced garbage collection', {
        heapBefore: `${(beforeGC.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapAfter: `${(afterGC.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        memoryFreed: `${freed.toFixed(2)}MB`,
        trigger: 'high_memory_usage'
      });
    } else {
      this.logger.warn('⚠️ Cannot force GC - not available');
    }
  }
  
  suggestGarbageCollection() {
    // Trigger minor GC by creating and releasing objects
    const temp = new Array(1000).fill(null);
    temp.length = 0;
  }
  
  logMemoryStats() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    this.logger.info('📊 Memory Statistics', {
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapUsage: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}%`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
      heapLimit: `${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)}MB`
    });
  }
  
  getMemoryReport() {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        heapUsagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      heap: {
        totalSize: heapStats.total_heap_size,
        usedSize: heapStats.used_heap_size,
        sizeLimit: heapStats.heap_size_limit,
        availableSize: heapStats.total_available_size,
        usagePercent: (heapStats.used_heap_size / heapStats.total_heap_size) * 100
      },
      gc: {
        nativeContexts: heapStats.number_of_native_contexts,
        detachedContexts: heapStats.number_of_detached_contexts
      }
    };
  }
}

module.exports = GCOptimizer;
