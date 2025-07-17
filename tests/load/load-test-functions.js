/**
 * Artillery Load Test Functions
 * Custom functions for WebSocket load testing
 */

const jwt = require('jsonwebtoken');

/**
 * Generate authentication token for load testing
 */
function generateAuthToken(context, events, done) {
  // Generate random user ID for this virtual user
  const userId = Math.floor(Math.random() * 10000) + 1;
  const roles = ['member', 'senior_member', 'moderator'];
  const role = roles[Math.floor(Math.random() * roles.length)];
  
  // Create JWT token
  const token = jwt.sign(
    {
      userId,
      role,
      permissions: ['read_notifications', 'receive_notifications'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only'
  );
  
  // Set variables for use in scenario
  context.vars.authToken = token;
  context.vars.userId = userId;
  context.vars.userRole = role;
  
  return done();
}

/**
 * Measure connection time
 */
function measureConnectionTime(context, events, done) {
  context.vars.connectionStartTime = Date.now();
  return done();
}

/**
 * Record connection established
 */
function recordConnectionEstablished(context, events, done) {
  if (context.vars.connectionStartTime) {
    const connectionTime = Date.now() - context.vars.connectionStartTime;
    events.emit('histogram', 'connection_time', connectionTime);
  }
  return done();
}

/**
 * Measure subscription time
 */
function measureSubscriptionTime(context, events, done) {
  context.vars.subscriptionStartTime = Date.now();
  return done();
}

/**
 * Record subscription completed
 */
function recordSubscriptionCompleted(context, events, done) {
  if (context.vars.subscriptionStartTime) {
    const subscriptionTime = Date.now() - context.vars.subscriptionStartTime;
    events.emit('histogram', 'subscription_time', subscriptionTime);
  }
  return done();
}

/**
 * Generate random notification data
 */
function generateNotificationData(context, events, done) {
  const notificationTypes = ['info', 'warning', 'success', 'error'];
  const titles = [
    'New Message',
    'System Update',
    'Forum Reply',
    'Friend Request',
    'Achievement Unlocked'
  ];
  const messages = [
    'You have received a new message',
    'System maintenance completed',
    'Someone replied to your post',
    'You have a new friend request',
    'Congratulations on your achievement'
  ];
  
  context.vars.notificationData = {
    id: `load_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
    title: titles[Math.floor(Math.random() * titles.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    timestamp: new Date().toISOString(),
    priority: Math.random() > 0.8 ? 'high' : 'normal'
  };
  
  return done();
}

/**
 * Simulate user activity patterns
 */
function simulateUserActivity(context, events, done) {
  const activities = [
    'browsing',
    'reading',
    'posting',
    'commenting',
    'searching',
    'idle'
  ];
  
  context.vars.userActivity = activities[Math.floor(Math.random() * activities.length)];
  return done();
}

/**
 * Random think time based on user behavior
 */
function randomThinkTime(context, events, done) {
  // Simulate realistic user behavior with variable think times
  const thinkTimes = {
    browsing: [1, 3],
    reading: [5, 15],
    posting: [10, 30],
    commenting: [3, 10],
    searching: [2, 8],
    idle: [30, 120]
  };
  
  const activity = context.vars.userActivity || 'browsing';
  const [min, max] = thinkTimes[activity] || [1, 5];
  const thinkTime = Math.floor(Math.random() * (max - min + 1)) + min;
  
  context.vars.thinkTime = thinkTime;
  return done();
}

/**
 * Log test metrics
 */
function logMetrics(context, events, done) {
  const metrics = {
    userId: context.vars.userId,
    userRole: context.vars.userRole,
    timestamp: new Date().toISOString(),
    phase: context.vars.$environment?.phase || 'unknown'
  };
  
  // Log to console in debug mode
  if (process.env.DEBUG) {
    console.log('Load Test Metrics:', metrics);
  }
  
  return done();
}

/**
 * Validate response data
 */
function validateResponse(context, events, done) {
  // This would be called after receiving responses
  // to validate that the server is responding correctly
  
  if (context.vars.lastResponse) {
    const response = context.vars.lastResponse;
    
    // Check for required fields
    if (response.timestamp && response.success !== undefined) {
      events.emit('counter', 'valid_responses', 1);
    } else {
      events.emit('counter', 'invalid_responses', 1);
    }
  }
  
  return done();
}

/**
 * Cleanup function
 */
function cleanup(context, events, done) {
  // Clean up any resources or log final metrics
  if (context.vars.connectionStartTime) {
    const totalSessionTime = Date.now() - context.vars.connectionStartTime;
    events.emit('histogram', 'session_duration', totalSessionTime);
  }
  
  return done();
}

module.exports = {
  generateAuthToken,
  measureConnectionTime,
  recordConnectionEstablished,
  measureSubscriptionTime,
  recordSubscriptionCompleted,
  generateNotificationData,
  simulateUserActivity,
  randomThinkTime,
  logMetrics,
  validateResponse,
  cleanup
};
