const axios = require('axios');
const fs = require('fs').promises;

class N8nService {
  constructor() {
    // Configure your n8n webhook URL
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook/sermonchronicler';
  }

  async triggerWorkflow(sermon) {
    try {
      // Read the transcript file
      const transcriptContent = await fs.readFile(sermon.transcriptPath, 'utf-8');

      // Prepare payload for n8n
      const payload = {
        jobId: sermon.id,
        sermonName: sermon.sermonName,
        speaker: sermon.speaker,
        date: sermon.date,
        transcript: transcriptContent,
        outputPath: `${sermon.speaker.toLowerCase().replace(/\s+/g, '-')}-${sermon.date}`
      };

      console.log(`Triggering n8n workflow for sermon: ${sermon.sermonName}`);
      
      // Send to n8n webhook
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout for webhook trigger
      });

      console.log('n8n workflow triggered successfully:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error triggering n8n workflow:', error.message);
      throw new Error(`Failed to trigger n8n workflow: ${error.message}`);
    }
  }

  async checkJobStatus(jobId) {
    // This would be used if n8n provides a status endpoint
    // For now, we'll rely on file system polling
    try {
      const statusUrl = `${this.webhookUrl}/status/${jobId}`;
      const response = await axios.get(statusUrl);
      return response.data;
    } catch (error) {
      console.error('Error checking job status:', error.message);
      return null;
    }
  }
}

module.exports = new N8nService();
