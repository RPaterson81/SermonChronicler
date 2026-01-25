const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtubeService');
const emailService = require('../services/emailService');
const n8nService = require('../services/n8nService');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SUBMISSIONS_FILE = path.join(__dirname, '../../data/submissions.json');

// Initialize submissions file
async function ensureSubmissionsFile() {
  try {
    await fs.access(SUBMISSIONS_FILE);
  } catch {
    await fs.mkdir(path.dirname(SUBMISSIONS_FILE), { recursive: true });
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
  }
}

async function readSubmissions() {
  await ensureSubmissionsFile();
  const data = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeSubmissions(submissions) {
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

// POST /api/submissions/single - Submit single video
router.post('/single', async (req, res, next) => {
  try {
    const { url, email } = req.body;

    if (!url || !email) {
      return res.status(400).json({ error: 'URL and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Extract video ID and get metadata
    const videoId = youtubeService.extractVideoId(url);
    const videoDetails = await youtubeService.getVideoDetails(videoId);

    // Create submission record
    const submissions = await readSubmissions();
    
    const submission = {
      id: uuidv4(),
      type: 'single-video',
      youtubeUrl: url,
      videoId,
      email,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      completedAt: null,
      metadata: videoDetails,
      filesReady: {
        cleanTranscript: false,
        notes: false,
        keywordStudy: false,
        leadersGuide: false,
        membersHandout: false
      }
    };

    submissions.push(submission);
    await writeSubmissions(submissions);

    // Trigger n8n workflow
    try {
      await n8nService.triggerWorkflow({
        jobId: submission.id,
        videoId: videoId,
        title: videoDetails.title,
        email: email,
        outputPath: `${videoId}-${Date.now()}`
      });

      // Update status to processing
      submission.status = 'processing';
      await writeSubmissions(submissions);
    } catch (error) {
      console.error('n8n trigger error:', error);
      submission.status = 'failed';
      await writeSubmissions(submissions);
      return res.status(500).json({ 
        error: 'Failed to start processing',
        submission 
      });
    }

    res.status(201).json({
      message: 'Video submitted for processing',
      submission
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions/active - Get active processing jobs
router.get('/active', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    
    const active = submissions.filter(s => 
      s.status === 'pending' || s.status === 'processing'
    ).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json(active);
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions/stats - Get dashboard statistics
router.get('/stats', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    
    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      processingCount: submissions.filter(s => 
        s.status === 'processing' || s.status === 'pending'
      ).length,
      completedToday: submissions.filter(s => 
        s.status === 'complete' && s.completedAt?.startsWith(today)
      ).length,
      storageUsed: '2.3 GB', // TODO: Calculate actual storage
      activeSubscriptions: 0 // TODO: Get from subscriptions
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions/activity - Get recent activity
router.get('/activity', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    
    // Get last 20 activities
    const activity = submissions
      .sort((a, b) => {
        const dateA = new Date(a.completedAt || a.submittedAt);
        const dateB = new Date(b.completedAt || b.submittedAt);
        return dateB - dateA;
      })
      .slice(0, 20)
      .map(s => {
        if (s.status === 'complete') {
          return {
            type: 'complete',
            message: `Completed: ${s.metadata.title}`,
            timestamp: s.completedAt
          };
        } else if (s.status === 'failed') {
          return {
            type: 'error',
            message: `Failed: ${s.metadata.title}`,
            timestamp: s.submittedAt
          };
        } else {
          return {
            type: 'submission',
            message: `Submitted: ${s.metadata.title}`,
            timestamp: s.submittedAt
          };
        }
      });

    res.json(activity);
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions/health - Check integration health
router.get('/health', async (req, res, next) => {
  try {
    const health = {
      n8n: 'unknown',
      youtube: 'unknown',
      storage: 'unknown',
      email: 'unknown'
    };

    // Check YouTube API
    try {
      await youtubeService.getVideoDetails('dQw4w9WgXcQ'); // Test with known video
      health.youtube = 'healthy';
    } catch (error) {
      health.youtube = 'down';
    }

    // Check email service
    try {
      const emailHealthy = await emailService.verifyConnection();
      health.email = emailHealthy ? 'healthy' : 'down';
    } catch (error) {
      health.email = 'down';
    }

    // Check storage (basic check)
    try {
      await fs.access(path.join(__dirname, '../../data'));
      health.storage = 'healthy';
    } catch (error) {
      health.storage = 'down';
    }

    // Check n8n (basic check - would need actual webhook test)
    if (process.env.N8N_WEBHOOK_URL) {
      health.n8n = 'healthy'; // Assume healthy if configured
    } else {
      health.n8n = 'down';
    }

    res.json(health);
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions/:id - Get specific submission
router.get('/:id', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    const submission = submissions.find(s => s.id === req.params.id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(submission);
  } catch (error) {
    next(error);
  }
});

// POST /api/submissions/:id/cancel - Cancel processing
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    const index = submissions.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissions[index];
    
    if (submission.status === 'complete') {
      return res.status(400).json({ error: 'Cannot cancel completed submission' });
    }

    submission.status = 'cancelled';
    submission.completedAt = new Date().toISOString();
    
    submissions[index] = submission;
    await writeSubmissions(submissions);

    res.json({
      message: 'Submission cancelled',
      submission
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/submissions/:id/retry - Retry failed processing
router.post('/:id/retry', async (req, res, next) => {
  try {
    const submissions = await readSubmissions();
    const index = submissions.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissions[index];
    
    if (submission.status !== 'failed' && submission.status !== 'cancelled') {
      return res.status(400).json({ error: 'Can only retry failed submissions' });
    }

    // Reset submission
    submission.status = 'pending';
    submission.completedAt = null;
    submission.filesReady = {
      cleanTranscript: false,
      notes: false,
      keywordStudy: false,
      leadersGuide: false,
      membersHandout: false
    };

    // Trigger n8n workflow
    try {
      await n8nService.triggerWorkflow({
        jobId: submission.id,
        videoId: submission.videoId,
        title: submission.metadata.title,
        email: submission.email,
        outputPath: `${submission.videoId}-${Date.now()}`
      });

      submission.status = 'processing';
    } catch (error) {
      console.error('n8n trigger error:', error);
      submission.status = 'failed';
    }

    submissions[index] = submission;
    await writeSubmissions(submissions);

    res.json({
      message: 'Submission retry initiated',
      submission
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/submissions/:id/status - Update submission status (internal use)
router.put('/:id/status', async (req, res, next) => {
  try {
    const { status, filesReady } = req.body;
    const submissions = await readSubmissions();
    const index = submissions.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissions[index];
    submission.status = status || submission.status;
    
    if (filesReady) {
      submission.filesReady = { ...submission.filesReady, ...filesReady };
    }

    if (status === 'complete') {
      submission.completedAt = new Date().toISOString();
      
      // Send completion email
      try {
        const downloadLinks = [
          { name: 'Clean Transcript', url: `${process.env.BASE_URL}/outputs/${submission.id}/clean-transcript.txt` },
          { name: 'Sermon Notes', url: `${process.env.BASE_URL}/outputs/${submission.id}/notes.txt` },
          { name: 'Keyword Study', url: `${process.env.BASE_URL}/outputs/${submission.id}/keyword-study.txt` },
          { name: 'Leaders Guide', url: `${process.env.BASE_URL}/outputs/${submission.id}/leaders-guide.txt` },
          { name: 'Members Handout', url: `${process.env.BASE_URL}/outputs/${submission.id}/members-handout.txt` }
        ];

        await emailService.sendProcessingComplete(
          submission.email,
          submission.metadata,
          downloadLinks
        );
      } catch (error) {
        console.error('Failed to send completion email:', error);
      }
    }

    submissions[index] = submission;
    await writeSubmissions(submissions);

    res.json(submission);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
