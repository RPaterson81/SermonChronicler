const axios = require('axios');

class N8nService {
  constructor() {
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.datacitadel.net/webhook-test/6f3f95a1-4b76-4b71-9793-399379f0e9d7';
  }

  async triggerWorkflow(payload) {
    try {
      console.log(`Triggering n8n workflow for job: ${payload.jobId}`);
      console.log(`Webhook URL: ${this.webhookUrl}`);
      
      // Send payload directly to n8n (no file reading needed)
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('n8n workflow triggered successfully');
      return response.data;
    } catch (error) {
      console.error('Error triggering n8n workflow:', error.message);
      throw new Error(`Failed to trigger n8n workflow: ${error.message}`);
    }
  }
}

module.exports = new N8nService();