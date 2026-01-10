const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const fsSync = require('fs');

const DATA_FILE = path.join(__dirname, '../../data/sermons.json');
const OUTPUTS_DIR = path.join(__dirname, '../../outputs');

// File type mappings
const FILE_TYPES = {
  cleanTranscript: 'clean-transcript.txt',
  notes: 'notes.txt',
  keywordStudy: 'keyword-study.txt',
  leadersGuide: 'leaders-guide.txt',
  membersHandout: 'members-handout.txt'
};

class SermonService {
  constructor() {
    this.initializeDataFile();
  }

  async initializeDataFile() {
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
  }

  async readData() {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  }

  async writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  }

  generateSermonName(speaker, date) {
    return `${speaker} - ${date}`;
  }

  generateSermonSlug(speaker, date) {
    return `${speaker.toLowerCase().replace(/\s+/g, '-')}-${date}`;
  }

  async createSermon({ speaker, date, transcriptPath }) {
    const sermons = await this.readData();
    
    const sermon = {
      id: uuidv4(),
      sermonName: this.generateSermonName(speaker, date),
      speaker,
      date,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      completedAt: null,
      transcriptPath,
      files: {
        cleanTranscript: null,
        notes: null,
        keywordStudy: null,
        leadersGuide: null,
        membersHandout: null
      },
      filesReady: {
        cleanTranscript: false,
        notes: false,
        keywordStudy: false,
        leadersGuide: false,
        membersHandout: false
      }
    };

    sermons.push(sermon);
    await this.writeData(sermons);
    
    // Create output directory for this sermon
    const sermonDir = path.join(OUTPUTS_DIR, this.generateSermonSlug(speaker, date));
    await fs.mkdir(sermonDir, { recursive: true });
    
    return sermon;
  }

  async getAllSermons() {
    const sermons = await this.readData();
    return sermons.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  async getSermonById(id) {
    const sermons = await this.readData();
    return sermons.find(s => s.id === id);
  }

  async updateSermonStatus(id, status, updates = {}) {
    const sermons = await this.readData();
    const index = sermons.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error('Sermon not found');
    }

    sermons[index] = {
      ...sermons[index],
      status,
      ...updates
    };

    if (status === 'complete') {
      sermons[index].completedAt = new Date().toISOString();
    }

    await this.writeData(sermons);
    return sermons[index];
  }

  async updateFileStatus(id, fileType, filePath) {
    const sermons = await this.readData();
    const index = sermons.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error('Sermon not found');
    }

    sermons[index].files[fileType] = filePath;
    sermons[index].filesReady[fileType] = true;

    // Check if all files are ready
    const allReady = Object.values(sermons[index].filesReady).every(ready => ready);
    if (allReady) {
      sermons[index].status = 'complete';
      sermons[index].completedAt = new Date().toISOString();
    } else {
      sermons[index].status = 'processing';
    }

    await this.writeData(sermons);
    return sermons[index];
  }

  async getFilePath(id, fileType) {
    const sermon = await this.getSermonById(id);
    
    if (!sermon || !sermon.filesReady[fileType]) {
      return null;
    }

    const sermonSlug = this.generateSermonSlug(sermon.speaker, sermon.date);
    const fileName = FILE_TYPES[fileType];
    const filePath = path.join(OUTPUTS_DIR, sermonSlug, fileName);

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      return null;
    }
  }

  async createZipArchive(id) {
    const sermon = await this.getSermonById(id);
    
    if (!sermon) {
      throw new Error('Sermon not found');
    }

    const sermonSlug = this.generateSermonSlug(sermon.speaker, sermon.date);
    const sermonDir = path.join(OUTPUTS_DIR, sermonSlug);
    const zipPath = path.join(OUTPUTS_DIR, `${sermonSlug}.zip`);

    return new Promise((resolve, reject) => {
      const output = fsSync.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sermonDir, false);
      archive.finalize();
    });
  }

  async cleanupZip(zipPath) {
    try {
      await fs.unlink(zipPath);
    } catch (error) {
      console.error('Failed to cleanup ZIP:', error);
    }
  }

  async deleteSermon(id) {
    const sermon = await this.getSermonById(id);
    
    if (!sermon) {
      throw new Error('Sermon not found');
    }

    // Delete output files
    const sermonSlug = this.generateSermonSlug(sermon.speaker, sermon.date);
    const sermonDir = path.join(OUTPUTS_DIR, sermonSlug);
    
    try {
      await fs.rm(sermonDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to delete sermon directory:', error);
    }

    // Delete uploaded transcript
    try {
      await fs.unlink(sermon.transcriptPath);
    } catch (error) {
      console.error('Failed to delete transcript:', error);
    }

    // Remove from database
    const sermons = await this.readData();
    const filtered = sermons.filter(s => s.id !== id);
    await this.writeData(filtered);
  }
}

module.exports = new SermonService();
