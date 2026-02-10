#!/usr/bin/env node

/**
 * SermonChronicler v2.x to v3.0 Migration Script
 * Migrates sermon data from JSON file to PostgreSQL database
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');

const DATA_FILE = path.join(__dirname, '../../data/sermons.json');

async function migrate() {
  try {
    console.log('🔄 Starting migration from v2.x to v3.0...\n');

    // Initialize database
    await db.initialize();
    console.log('✓ Database connection established\n');

    // Check if JSON file exists
    try {
      await fs.access(DATA_FILE);
    } catch {
      console.log('ℹ No existing sermons.json file found - skipping data migration');
      console.log('✓ Migration complete (no data to migrate)\n');
      await db.close();
      return;
    }

    // Read JSON data
    const jsonData = await fs.readFile(DATA_FILE, 'utf-8');
    const sermons = JSON.parse(jsonData);

    if (sermons.length === 0) {
      console.log('ℹ No sermons found in JSON file - nothing to migrate');
      console.log('✓ Migration complete\n');
      await db.close();
      return;
    }

    console.log(`Found ${sermons.length} sermons to migrate\n`);

    // Get or create default admin user for legacy sermons
    let adminUser;
    const adminResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@sermonchronicler.com']
    );

    if (adminResult.rows.length > 0) {
      adminUser = adminResult.rows[0];
      console.log('✓ Using existing admin user for legacy sermons\n');
    } else {
      console.log('✗ Error: Admin user not found');
      console.log('Please ensure the database schema has been initialized first\n');
      await db.close();
      process.exit(1);
    }

    // Migrate each sermon
    let successCount = 0;
    let errorCount = 0;

    for (const sermon of sermons) {
      try {
        const client = await db.getClient();
        
        try {
          await client.query('BEGIN');

          // Insert sermon
          const sermonResult = await client.query(
            `INSERT INTO sermons (
              id, user_id, sermon_name, speaker, date, status, 
              submission_type, transcript_path, submitted_at, completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
            RETURNING id`,
            [
              sermon.id,
              adminUser.id,
              sermon.sermonName,
              sermon.speaker,
              sermon.date,
              sermon.status,
              'transcript',
              sermon.transcriptPath,
              sermon.submittedAt,
              sermon.completedAt || null
            ]
          );

          if (sermonResult.rows.length === 0) {
            console.log(`⚠ Skipping sermon ${sermon.id} (already exists)`);
            await client.query('ROLLBACK');
            client.release();
            continue;
          }

          // Insert sermon files
          const fileTypes = Object.keys(sermon.filesReady || {});
          for (const fileType of fileTypes) {
            const isReady = sermon.filesReady[fileType];
            const filePath = sermon.files?.[fileType] || null;

            await client.query(
              `INSERT INTO sermon_files (sermon_id, file_type, file_path, is_ready, generated_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (sermon_id, file_type) DO NOTHING`,
              [
                sermon.id,
                fileType,
                filePath,
                isReady,
                isReady ? sermon.completedAt : null
              ]
            );
          }

          await client.query('COMMIT');
          console.log(`✓ Migrated: ${sermon.sermonName}`);
          successCount++;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error(`✗ Error migrating sermon ${sermon.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total sermons: ${sermons.length}`);
    console.log(`   ✓ Successfully migrated: ${successCount}`);
    console.log(`   ✗ Errors: ${errorCount}`);

    // Backup original JSON file
    const backupFile = DATA_FILE + '.backup-' + Date.now();
    await fs.copyFile(DATA_FILE, backupFile);
    console.log(`\n✓ Original data backed up to: ${backupFile}`);

    console.log('\n✅ Migration complete!\n');
    
    await db.close();
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    await db.close();
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  migrate();
}

module.exports = migrate;
