const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/database');
const auth = require('../middleware/auth');
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

// POST /api/sermons - Submit new transcript (requires authentication)
router.post('/', auth.authenticate, upload.single('transcript'), async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    const { speaker, date } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Transcript file is required' });
    }
    
    if (!speaker || !date) {
      return res.status(400).json({ error: 'Speaker name and date are required' });
    }

    await client.query('BEGIN');

    // Create sermon record
    const sermonName = `${speaker} - ${date}`;
    const sermonResult = await client.query(
      `INSERT INTO sermons (user_id, sermon_name, speaker, date, status, submission_type, transcript_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, sermonName, speaker, date, 'pending', 'transcript', req.file.path]
    );

    const sermon = sermonResult.rows[0];

    // Create file records
    const fileTypes = ['cleanTranscript', 'notes', 'keywordStudy', 'leadersGuide', 'membersHandout'];
    for (const fileType of fileTypes) {
      await client.query(
        `INSERT INTO sermon_files (sermon_id, file_type, is_ready)
         VALUES ($1, $2, $3)`,
        [sermon.id, fileType, false]
      );
    }

    await client.query('COMMIT');

    // Trigger n8n workflow
    try {
      await n8nService.triggerWorkflow({
        ...sermon,
        sermonName: sermon.sermon_name
      });
    } catch (n8nError) {
      console.error('n8n workflow trigger failed:', n8nError);
      // Don't fail the request, just log the error
    }

    // Log audit event
    await auth.logAuditEvent(
      req.user.id,
      'SERMON_SUBMITTED',
      'sermon',
      sermon.id,
      { speaker, date },
      req.ip
    );

    res.status(201).json({
      message: 'Sermon submitted for processing',
      sermon: {
        id: sermon.id,
        sermonName: sermon.sermon_name,
        speaker: sermon.speaker,
        date: sermon.date,
        status: sermon.status,
        submittedAt: sermon.submitted_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// GET /api/sermons - Get sermons (user sees only their own, admin sees all)
router.get('/', auth.authenticate, async (req, res, next) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      // Admin sees all sermons
      query = `
        SELECT 
          s.*,
          u.full_name as user_name,
          u.email as user_email,
          json_agg(
            json_build_object(
              'fileType', sf.file_type,
              'isReady', sf.is_ready,
              'filePath', sf.file_path,
              'generatedAt', sf.generated_at
            )
          ) as files
        FROM sermons s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN sermon_files sf ON s.id = sf.sermon_id
        GROUP BY s.id, u.full_name, u.email
        ORDER BY s.created_at DESC
      `;
      params = [];
    } else {
      // Regular users see only their sermons
      query = `
        SELECT 
          s.*,
          json_agg(
            json_build_object(
              'fileType', sf.file_type,
              'isReady', sf.is_ready,
              'filePath', sf.file_path,
              'generatedAt', sf.generated_at
            )
          ) as files
        FROM sermons s
        LEFT JOIN sermon_files sf ON s.id = sf.sermon_id
        WHERE s.user_id = $1
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `;
      params = [req.user.id];
    }

    const result = await db.query(query, params);

    // Transform data to match frontend expectations
    const sermons = result.rows.map(row => {
      const filesReady = {};
      const filesObject = {};
      
      if (row.files && row.files[0].fileType) {
        row.files.forEach(file => {
          filesReady[file.fileType] = file.isReady;
          filesObject[file.fileType] = file.filePath;
        });
      }

      return {
        id: row.id,
        sermonName: row.sermon_name,
        speaker: row.speaker,
        date: row.date,
        status: row.status,
        submissionType: row.submission_type,
        youtubeUrl: row.youtube_url,
        submittedAt: row.submitted_at,
        completedAt: row.completed_at,
        errorMessage: row.error_message,
        filesReady,
        files: filesObject,
        ...(req.user.role === 'admin' && {
          userName: row.user_name,
          userEmail: row.user_email
        })
      };
    });

    res.json(sermons);
  } catch (error) {
    next(error);
  }
});

// GET /api/sermons/:id - Get specific sermon
router.get('/:id', auth.authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT 
        s.*,
        u.full_name as user_name,
        u.email as user_email,
        json_agg(
          json_build_object(
            'fileType', sf.file_type,
            'isReady', sf.is_ready,
            'filePath', sf.file_path,
            'generatedAt', sf.generated_at
          )
        ) as files
       FROM sermons s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN sermon_files sf ON s.id = sf.sermon_id
       WHERE s.id = $1
       GROUP BY s.id, u.full_name, u.email`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sermon not found' });
    }

    const sermon = result.rows[0];

    // Check authorization (users can only see their own sermons, admins can see all)
    if (req.user.role !== 'admin' && sermon.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Transform files data
    const filesReady = {};
    const filesObject = {};
    
    if (sermon.files && sermon.files[0].fileType) {
      sermon.files.forEach(file => {
        filesReady[file.fileType] = file.isReady;
        filesObject[file.fileType] = file.filePath;
      });
    }

    res.json({
      id: sermon.id,
      sermonName: sermon.sermon_name,
      speaker: sermon.speaker,
      date: sermon.date,
      status: sermon.status,
      submissionType: sermon.submission_type,
      youtubeUrl: sermon.youtube_url,
      submittedAt: sermon.submitted_at,
      completedAt: sermon.completed_at,
      errorMessage: sermon.error_message,
      filesReady,
      files: filesObject,
      userName: sermon.user_name,
      userEmail: sermon.user_email
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/sermons/:id/callback - n8n callback to update sermon status
router.post('/:id/callback', async (req, res, next) => {
  const client = await db.getClient();
  
  try {
    const { id } = req.params;
    const { status, fileType, filePath, error } = req.body;

    await client.query('BEGIN');

    // Update sermon status
    if (status) {
      const updateQuery = error
        ? 'UPDATE sermons SET status = $1, error_message = $2 WHERE id = $3'
        : 'UPDATE sermons SET status = $1 WHERE id = $2';
      
      const updateParams = error ? [status, error, id] : [status, id];
      await client.query(updateQuery, updateParams);
    }

    // Update file status
    if (fileType && filePath) {
      await client.query(
        `UPDATE sermon_files 
         SET file_path = $1, is_ready = true, generated_at = NOW()
         WHERE sermon_id = $2 AND file_type = $3`,
        [filePath, id, fileType]
      );

      // Check if all files are ready
      const filesResult = await client.query(
        'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_ready = true) as ready FROM sermon_files WHERE sermon_id = $1',
        [id]
      );

      const { total, ready } = filesResult.rows[0];
      
      if (parseInt(total) === parseInt(ready)) {
        await client.query(
          'UPDATE sermons SET status = $1, completed_at = NOW() WHERE id = $2',
          ['complete', id]
        );
      } else {
        await client.query(
          'UPDATE sermons SET status = $1 WHERE id = $2',
          ['processing', id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// GET /api/sermons/:id/files/:type - Download specific file
router.get('/:id/files/:type', auth.authenticate, async (req, res, next) => {
  try {
    const { id, type } = req.params;

    // Get sermon to check ownership
    const sermonResult = await db.query(
      'SELECT user_id FROM sermons WHERE id = $1',
      [id]
    );

    if (sermonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sermon not found' });
    }

    // Check authorization
    if (req.user.role !== 'admin' && sermonResult.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get file path
    const fileResult = await db.query(
      'SELECT file_path FROM sermon_files WHERE sermon_id = $1 AND file_type = $2 AND is_ready = true',
      [id, type]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or not ready' });
    }

    const filePath = fileResult.rows[0].file_path;
    
    res.download(filePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/sermons/:id/download - Download all files as ZIP
router.get('/:id/download', auth.authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get sermon to check ownership
    const sermonResult = await db.query(
      'SELECT user_id, sermon_name, speaker, date FROM sermons WHERE id = $1',
      [id]
    );

    if (sermonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sermon not found' });
    }

    const sermon = sermonResult.rows[0];

    // Check authorization
    if (req.user.role !== 'admin' && sermon.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Use existing ZIP creation logic from sermonService
    const sermonService = require('../services/sermonService');
    const zipPath = await sermonService.createZipArchive(id);

    res.download(zipPath, (err) => {
      if (err) {
        next(err);
      }
      sermonService.cleanupZip(zipPath);
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/sermons/:id - Delete sermon
router.delete('/:id', auth.authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get sermon to check ownership
    const sermonResult = await db.query(
      'SELECT user_id, transcript_path, speaker, date FROM sermons WHERE id = $1',
      [id]
    );

    if (sermonResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sermon not found' });
    }

    const sermon = sermonResult.rows[0];

    // Check authorization (users can only delete their own, admins can delete any)
    if (req.user.role !== 'admin' && sermon.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete files from filesystem
    const sermonService = require('../services/sermonService');
    await sermonService.deleteSermonFiles(id, sermon.speaker, sermon.date, sermon.transcript_path);

    // Delete from database (cascade will handle sermon_files)
    await db.query('DELETE FROM sermons WHERE id = $1', [id]);

    // Log audit event
    await auth.logAuditEvent(
      req.user.id,
      'SERMON_DELETED',
      'sermon',
      id,
      { sermonName: `${sermon.speaker} - ${sermon.date}` },
      req.ip
    );

    res.json({ message: 'Sermon deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
