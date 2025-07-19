const v8 = require('v8');
const fs = require('fs');

function analyzeMemory() {
  const memUsage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  
  console.log('🔍 Memory Analysis Report');
  console.log('========================');
  
  console.log('\n📊 Process Memory Usage:');
  console.log(`RSS (Resident Set Size): ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Usage: ${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}%`);
  console.log(`External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Array Buffers: ${(memUsage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('\n🏗️ V8 Heap Statistics:');
  console.log(`Total Heap Size: ${(heapStats.total_heap_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Used Heap Size: ${(heapStats.used_heap_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Size Limit: ${(heapStats.heap_size_limit / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Available Heap: ${(heapStats.total_available_size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Usage: ${((heapStats.used_heap_size / heapStats.total_heap_size) * 100).toFixed(2)}%`);
  
  console.log('\n🧹 Garbage Collection:');
  console.log(`Native Contexts: ${heapStats.number_of_native_contexts}`);
  console.log(`Detached Contexts: ${heapStats.number_of_detached_contexts}`);
  console.log(`Malloced Memory: ${(heapStats.malloced_memory / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Peak Malloced: ${(heapStats.peak_malloced_memory / 1024 / 1024).toFixed(2)} MB`);
  
  // Check for potential memory leaks
  const heapUsagePercent = (heapStats.used_heap_size / heapStats.total_heap_size) * 100;
  
  console.log('\n⚠️ Memory Health Check:');
  if (heapUsagePercent > 90) {
    console.log('🔴 CRITICAL: Heap usage > 90% - Memory leak suspected!');
  } else if (heapUsagePercent > 80) {
    console.log('🟡 WARNING: Heap usage > 80% - Monitor closely');
  } else if (heapUsagePercent > 70) {
    console.log('🟠 CAUTION: Heap usage > 70% - Consider optimization');
  } else {
    console.log('🟢 HEALTHY: Heap usage is normal');
  }
  
  if (heapStats.number_of_detached_contexts > 0) {
    console.log('🔴 MEMORY LEAK: Detached contexts detected!');
  }
  
  // Force garbage collection if available
  if (global.gc) {
    console.log('\n🧹 Running garbage collection...');
    global.gc();
    const afterGC = process.memoryUsage();
    console.log(`Heap after GC: ${(afterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memory freed: ${((memUsage.heapUsed - afterGC.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  }
}

analyzeMemory();
