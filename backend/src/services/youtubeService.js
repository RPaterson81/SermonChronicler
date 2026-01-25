const { google } = require('googleapis');

class YouTubeService {
  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });
  }

  async getVideoDetails(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: 'snippet,contentDetails,statistics',
        id: videoId
      });

      if (response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      return {
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail: video.snippet.thumbnails.high.url,
        duration: video.contentDetails.duration,
        publishedAt: video.snippet.publishedAt,
        channelId: video.snippet.channelId,
        channelTitle: video.snippet.channelTitle
      };
    } catch (error) {
      console.error('YouTube API error:', error);
      throw new Error(`Failed to fetch video details: ${error.message}`);
    }
  }

  async getChannelVideos(channelId, maxResults = 10) {
    try {
      const response = await this.youtube.search.list({
        part: 'snippet',
        channelId: channelId,
        maxResults: maxResults,
        order: 'date',
        type: 'video'
      });

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high.url,
        publishedAt: item.snippet.publishedAt
      }));
    } catch (error) {
      console.error('YouTube API error:', error);
      throw new Error(`Failed to fetch channel videos: ${error.message}`);
    }
  }

  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    throw new Error('Invalid YouTube video URL');
  }

  async extractChannelId(url) {
    // Handle @username format
    const usernameMatch = url.match(/@([\w-]+)/);
    if (usernameMatch) {
      return await this.getChannelIdByUsername(usernameMatch[1]);
    }

    // Handle /channel/ID format
    const channelMatch = url.match(/\/channel\/([\w-]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }

    throw new Error('Invalid YouTube channel URL');
  }

  async getChannelIdByUsername(username) {
    try {
      const response = await this.youtube.channels.list({
        part: 'id',
        forUsername: username
      });

      if (response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      return response.data.items[0].id;
    } catch (error) {
      console.error('YouTube API error:', error);
      throw new Error(`Failed to find channel: ${error.message}`);
    }
  }

  async getChannelDetails(channelId) {
    try {
      const response = await this.youtube.channels.list({
        part: 'snippet,statistics',
        id: channelId
      });

      if (response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = response.data.items[0];
      return {
        id: channel.id,
        name: channel.snippet.title,
        description: channel.snippet.description,
        thumbnail: channel.snippet.thumbnails.high.url,
        subscriberCount: channel.statistics.subscriberCount,
        videoCount: channel.statistics.videoCount
      };
    } catch (error) {
      console.error('YouTube API error:', error);
      throw new Error(`Failed to fetch channel details: ${error.message}`);
    }
  }
}

module.exports = new YouTubeService();
