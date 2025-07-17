const channelManager = require('../../../src/websocket/channelManager');

describe('ChannelManager', () => {
  let testSocket;

  beforeEach(() => {
    // Clear channel manager state
    channelManager.channels.clear();
    channelManager.userChannels.clear();
    channelManager.channelMetadata.clear();
    
    // Create test socket
    testSocket = global.testUtils.createMockSocket(1, 'member');
  });

  describe('Channel Authorization', () => {
    describe('Public Channels', () => {
      it('should authorize public channel access for authenticated users', async () => {
        const authorized = await channelManager.authorize(testSocket, 'public.announcements');
        expect(authorized).toBe(true);
      });
    });

    describe('Private User Channels', () => {
      it('should authorize access to own private channel', async () => {
        const authorized = await channelManager.authorize(testSocket, 'private-user.1');
        expect(authorized).toBe(true);
      });

      it('should deny access to other user\'s private channel', async () => {
        const authorized = await channelManager.authorize(testSocket, 'private-user.2');
        expect(authorized).toBe(false);
      });
    });

    describe('Admin Channels', () => {
      it('should authorize admin user for admin channels', async () => {
        const adminSocket = global.testUtils.createMockSocket(999, 'admin');
        const authorized = await channelManager.authorize(adminSocket, 'admin.system');
        expect(authorized).toBe(true);
      });

      it('should deny regular user access to admin channels', async () => {
        const authorized = await channelManager.authorize(testSocket, 'admin.system');
        expect(authorized).toBe(false);
      });
    });

    describe('Moderator Channels', () => {
      it('should authorize moderator for moderator channels', async () => {
        const modSocket = global.testUtils.createMockSocket(500, 'moderator');
        const authorized = await channelManager.authorize(modSocket, 'moderator.reports');
        expect(authorized).toBe(true);
      });

      it('should authorize admin for moderator channels', async () => {
        const adminSocket = global.testUtils.createMockSocket(999, 'admin');
        const authorized = await channelManager.authorize(adminSocket, 'moderator.reports');
        expect(authorized).toBe(true);
      });

      it('should deny regular user access to moderator channels', async () => {
        const authorized = await channelManager.authorize(testSocket, 'moderator.reports');
        expect(authorized).toBe(false);
      });
    });

    describe('Forum Channels', () => {
      it('should authorize member for forum channels', async () => {
        const authorized = await channelManager.authorize(testSocket, 'forum.1');
        expect(authorized).toBe(true);
      });

      it('should deny guest access to forum channels', async () => {
        const guestSocket = global.testUtils.createMockSocket(100, 'guest');
        const authorized = await channelManager.authorize(guestSocket, 'forum.1');
        expect(authorized).toBe(false);
      });
    });

    describe('Unknown Channels', () => {
      it('should deny access to unknown channel patterns', async () => {
        const authorized = await channelManager.authorize(testSocket, 'unknown.channel');
        expect(authorized).toBe(false);
      });
    });
  });

  describe('Channel Subscription Management', () => {
    it('should subscribe socket to channel', () => {
      const channel = 'private-user.1';
      
      channelManager.subscribe(testSocket, channel);
      
      expect(channelManager.getChannelSubscribers(channel).has(testSocket.id)).toBe(true);
      expect(channelManager.getUserChannels(1).has(channel)).toBe(true);
    });

    it('should unsubscribe socket from channel', () => {
      const channel = 'private-user.1';
      
      // First subscribe
      channelManager.subscribe(testSocket, channel);
      expect(channelManager.getChannelSubscribers(channel).has(testSocket.id)).toBe(true);
      
      // Then unsubscribe
      channelManager.unsubscribe(testSocket, channel);
      expect(channelManager.getChannelSubscribers(channel).has(testSocket.id)).toBe(false);
    });

    it('should unsubscribe socket from all channels', () => {
      const channels = ['private-user.1', 'public.announcements', 'forum.1'];
      
      // Subscribe to multiple channels
      channels.forEach(channel => {
        channelManager.subscribe(testSocket, channel);
      });
      
      // Verify subscriptions
      channels.forEach(channel => {
        expect(channelManager.getChannelSubscribers(channel).has(testSocket.id)).toBe(true);
      });
      
      // Unsubscribe from all
      channelManager.unsubscribeAll(testSocket);
      
      // Verify all unsubscribed
      channels.forEach(channel => {
        expect(channelManager.getChannelSubscribers(channel).has(testSocket.id)).toBe(false);
      });
    });

    it('should clean up empty channels', () => {
      const channel = 'private-user.1';
      
      // Subscribe and then unsubscribe
      channelManager.subscribe(testSocket, channel);
      expect(channelManager.channels.has(channel)).toBe(true);
      
      channelManager.unsubscribe(testSocket, channel);
      expect(channelManager.channels.has(channel)).toBe(false);
    });

    it('should handle multiple subscribers to same channel', () => {
      const channel = 'public.announcements';
      const socket2 = global.testUtils.createMockSocket(2, 'member');
      
      // Subscribe both sockets
      channelManager.subscribe(testSocket, channel);
      channelManager.subscribe(socket2, channel);
      
      const subscribers = channelManager.getChannelSubscribers(channel);
      expect(subscribers.size).toBe(2);
      expect(subscribers.has(testSocket.id)).toBe(true);
      expect(subscribers.has(socket2.id)).toBe(true);
      
      // Unsubscribe one socket
      channelManager.unsubscribe(testSocket, channel);
      
      const remainingSubscribers = channelManager.getChannelSubscribers(channel);
      expect(remainingSubscribers.size).toBe(1);
      expect(remainingSubscribers.has(socket2.id)).toBe(true);
    });
  });

  describe('Channel Statistics', () => {
    it('should return accurate channel statistics', () => {
      // Subscribe to various channels
      channelManager.subscribe(testSocket, 'public.announcements');
      channelManager.subscribe(testSocket, 'private-user.1');
      channelManager.subscribe(testSocket, 'forum.1');
      
      const socket2 = global.testUtils.createMockSocket(2, 'admin');
      channelManager.subscribe(socket2, 'public.announcements');
      channelManager.subscribe(socket2, 'admin.system');
      
      const stats = channelManager.getChannelStats();
      
      expect(stats.totalChannels).toBe(4);
      expect(stats.totalSubscriptions).toBe(5);
      expect(stats.channelsByType).toHaveProperty('public', 1);
      expect(stats.channelsByType).toHaveProperty('private_user', 1);
      expect(stats.channelsByType).toHaveProperty('forum', 1);
      expect(stats.channelsByType).toHaveProperty('admin', 1);
      expect(stats.topChannels).toHaveLength(4);
      
      // Check top channel (public.announcements should have 2 subscribers)
      const topChannel = stats.topChannels[0];
      expect(topChannel.channel).toBe('public.announcements');
      expect(topChannel.subscribers).toBe(2);
    });

    it('should return empty stats when no channels exist', () => {
      const stats = channelManager.getChannelStats();
      
      expect(stats.totalChannels).toBe(0);
      expect(stats.totalSubscriptions).toBe(0);
      expect(stats.channelsByType).toEqual({});
      expect(stats.topChannels).toEqual([]);
    });
  });

  describe('Channel Metadata', () => {
    it('should update channel metadata on subscription', () => {
      const channel = 'private-user.1';
      
      channelManager.subscribe(testSocket, channel);
      
      const metadata = channelManager.channelMetadata.get(channel);
      expect(metadata).toBeDefined();
      expect(metadata.subscriberCount).toBe(1);
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.lastActivity).toBeInstanceOf(Date);
    });

    it('should update subscriber count in metadata', () => {
      const channel = 'public.announcements';
      const socket2 = global.testUtils.createMockSocket(2, 'member');
      
      // First subscription
      channelManager.subscribe(testSocket, channel);
      expect(channelManager.channelMetadata.get(channel).subscriberCount).toBe(1);
      
      // Second subscription
      channelManager.subscribe(socket2, channel);
      expect(channelManager.channelMetadata.get(channel).subscriberCount).toBe(2);
      
      // Unsubscribe one
      channelManager.unsubscribe(testSocket, channel);
      expect(channelManager.channelMetadata.get(channel).subscriberCount).toBe(1);
    });
  });
});
