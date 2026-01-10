const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const sermonService = require('../services/sermonService');
const n8nService = require('../services/n8nService');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `transcript-${uniqueSuffix}.txt`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || path.extname(file.originalname) === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/sermons - Submit new transcript
router.post('/', upload.single('transcript'), async (req, res, next) => {
  try {
    const { speaker, date } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Transcript file is required' });
    }
    
    if (!speaker || !date) {
      return res.status(400).json({ error: 'Speaker name and date are required' });
    }

    // Create sermon job
    const sermon = await sermonService.createSermon({
      speaker,
      date,
      transcriptPath: req.file.path
    });

    // Trigger n8n workflow
    await n8nService.triggerWorkflow(sermon);

    res.status(201).json({
      message: 'Sermon submitted for processing',
      sermon
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sermons - Get all sermons
router.get('/', async (req, res, next) => {
  try {
    const sermons = await sermonService.getAllSermons();
    res.json(sermons);
  } catch (error) {
    next(error);
  }
});

// GET /api/sermons/:id - Get specific sermon
router.get('/:id', async (req, res, next) => {
  try {
    const sermon = await sermonService.getSermonById(req.params.id);
    
    if (!sermon) {
      return res.status(404).json({ error: 'Sermon not found' });
    }
    
    res.json(sermon);
  } catch (error) {
    next(error);
  }
});

// GET /api/sermons/:id/files/:type - Download specific file
router.get('/:id/files/:type', async (req, res, next) => {
  try {
    const { id, type } = req.params;
    const filePath = await sermonService.getFilePath(id, type);
    
    if (!filePath) {
      return res.status(404).json({ error: 'File not found or not ready' });
    }
    
    res.download(filePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/sermons/:id/download - Download all files as ZIP
router.get('/:id/download', async (req, res, next) => {
  try {
    const zipPath = await sermonService.createZipArchive(req.params.id);
    
    res.download(zipPath, (err) => {
      if (err) {
        next(err);
      }
      // Clean up ZIP file after download
      sermonService.cleanupZip(zipPath);
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sermons/:id - Delete sermon
router.delete('/:id', async (req, res, next) => {
  try {
    await sermonService.deleteSermon(req.params.id);
    res.json({ message: 'Sermon deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
