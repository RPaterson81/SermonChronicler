const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'sermonchronicler',
      user: process.env.DB_USER || 'scadmin',
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });

    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const client = await this.pool.connect();
      console.log('✓ Database connection established');
      
      // Test query
      await client.query('SELECT NOW()');
      console.log('✓ Database health check passed');
      
      client.release();
      this.initialized = true;
    } catch (error) {
      console.error('✗ Database connection failed:', error.message);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Query executed:', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
    console.log('Database connection pool closed');
  }
}

module.exports = new Database();
