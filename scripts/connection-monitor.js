#!/usr/bin/env node

/**
 * Connection Monitor Script
 * Monitors WebSocket connections and automatically handles spam behavior
 */

const axios = require('axios');
const logger = require('../src/utils/logger');

class ConnectionMonitor {
  constructor() {
    this.baseUrl = 'https://realtime.mechamap.com/api';
    this.spamThreshold = 10; // Max duplicate connections per minute
    this.monitorInterval = 30000; // Check every 30 seconds
    this.spamUsers = new Map(); // userId -> { count, firstSeen, lastSeen }
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Connection monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting connection monitor...');
    
    // Initial check
    await this.checkConnections();
    
    // Set up interval
    this.intervalId = setInterval(async () => {
      try {
        await this.checkConnections();
      } catch (error) {
        console.error('❌ Monitor check failed:', error.message);
      }
    }, this.monitorInterval);

    console.log(`✅ Connection monitor started (checking every ${this.monitorInterval/1000}s)`);
  }

  async stop() {
    if (!this.isRunning) {
      console.log('⚠️  Connection monitor is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    console.log('🛑 Connection monitor stopped');
  }

  async checkConnections() {
    try {
      // Get connection stats
      const statsResponse = await axios.get(`${this.baseUrl}/connections/stats`);
      const stats = statsResponse.data.data;

      console.log(`📊 Connection Stats: Active: ${stats.activeConnections}, Duplicates: ${stats.duplicateConnections}, Throttled: ${stats.throttledUsers}`);

      // Check for spam behavior
      if (stats.duplicateConnections > this.spamThreshold) {
        console.log(`🚨 High duplicate connections detected: ${stats.duplicateConnections}`);
        await this.handleSpamBehavior();
      }

      // Log memory alerts if any
      if (stats.memoryUsage && stats.memoryUsage > 85) {
        console.log(`⚠️  High memory usage: ${stats.memoryUsage}%`);
      }

    } catch (error) {
      console.error('❌ Failed to check connections:', error.message);
    }
  }

  async handleSpamBehavior() {
    console.log('🔧 Handling spam behavior...');
    
    // For now, we'll implement a simple solution
    // In a real scenario, you'd want to identify specific spam users
    
    try {
      // Clear all connections as a reset
      const clearResponse = await axios.post(`${this.baseUrl}/connections/clear-all`);
      if (clearResponse.data.success) {
        console.log('✅ All connections cleared to reset spam behavior');
      }
    } catch (error) {
      console.error('❌ Failed to clear connections:', error.message);
    }
  }

  async getConnectionInfo(userId) {
    try {
      const response = await axios.get(`${this.baseUrl}/connections/user/${userId}`);
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // User not connected
      }
      throw error;
    }
  }

  async forceDisconnectUser(userId, reason = 'spam_behavior') {
    try {
      const response = await axios.post(`${this.baseUrl}/connections/disconnect/${userId}`, {
        reason: reason
      });
      return response.data.success;
    } catch (error) {
      console.error(`❌ Failed to disconnect user ${userId}:`, error.message);
      return false;
    }
  }

  // Manual commands
  async status() {
    try {
      const response = await axios.get(`${this.baseUrl}/connections/stats`);
      const stats = response.data.data;
      
      console.log('\n📊 Current Connection Status:');
      console.log(`   Active Connections: ${stats.activeConnections}`);
      console.log(`   Total Connections: ${stats.totalConnections}`);
      console.log(`   Peak Connections: ${stats.peakConnections}`);
      console.log(`   Duplicate Connections: ${stats.duplicateConnections}`);
      console.log(`   Rejected Connections: ${stats.rejectedConnections}`);
      console.log(`   Throttled Users: ${stats.throttledUsers}`);
      
    } catch (error) {
      console.error('❌ Failed to get status:', error.message);
    }
  }

  async checkUser(userId) {
    try {
      const connection = await this.getConnectionInfo(userId);
      if (connection) {
        console.log(`\n👤 User ${userId} Connection Info:`);
        console.log(`   Socket ID: ${connection.socketId}`);
        console.log(`   Connected At: ${connection.connectedAt}`);
        console.log(`   Last Activity: ${connection.lastActivity}`);
        console.log(`   Is Alive: ${connection.isAlive}`);
      } else {
        console.log(`\n👤 User ${userId} is not connected`);
      }
    } catch (error) {
      console.error(`❌ Failed to check user ${userId}:`, error.message);
    }
  }

  async disconnectUser(userId) {
    try {
      const success = await this.forceDisconnectUser(userId, 'manual_disconnect');
      if (success) {
        console.log(`✅ User ${userId} disconnected successfully`);
      } else {
        console.log(`❌ Failed to disconnect user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error disconnecting user ${userId}:`, error.message);
    }
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new ConnectionMonitor();
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'start':
      monitor.start();
      break;
      
    case 'stop':
      monitor.stop();
      process.exit(0);
      break;
      
    case 'status':
      monitor.status().then(() => process.exit(0));
      break;
      
    case 'check':
      if (!arg) {
        console.log('Usage: node connection-monitor.js check <userId>');
        process.exit(1);
      }
      monitor.checkUser(arg).then(() => process.exit(0));
      break;
      
    case 'disconnect':
      if (!arg) {
        console.log('Usage: node connection-monitor.js disconnect <userId>');
        process.exit(1);
      }
      monitor.disconnectUser(arg).then(() => process.exit(0));
      break;
      
    default:
      console.log('Usage:');
      console.log('  node connection-monitor.js start     - Start monitoring');
      console.log('  node connection-monitor.js stop      - Stop monitoring');
      console.log('  node connection-monitor.js status    - Show connection status');
      console.log('  node connection-monitor.js check <userId>    - Check specific user');
      console.log('  node connection-monitor.js disconnect <userId> - Disconnect user');
      process.exit(1);
  }
}

module.exports = ConnectionMonitor;
