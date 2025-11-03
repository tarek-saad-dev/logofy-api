const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings for better stability
  max: 10, // Maximum number of clients in the pool (reduced for stability)
  min: 1,  // Minimum number of clients in the pool
  idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
  maxUses: 1000, // Close (and replace) a connection after it has been used 1000 times
  allowExitOnIdle: false // Don't allow the pool to close all connections when idle
});

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('New client connected to database');
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Enable uuid extension for UUID generation
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Check if we need to migrate to the new schema
    const checkSchema = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'layers' AND table_schema = 'public'
      );
    `);

    if (!checkSchema.rows[0].exists) {
      console.log('🔄 Migrating to Logo Maker schema...');
      try {
        const { simpleMigrate } = require('./simple-migrate');
        await simpleMigrate();
        console.log('✅ Logo Maker schema migration completed');
        client.release();
        return;
      } catch (error) {
        console.error('❌ Migration failed:', error.message);
        client.release();
        throw error;
      }
    } else {
      console.log('✅ Logo Maker schema already exists');
    }

    // Logo Maker schema is already set up, no legacy initialization needed

    // Run auth migration
    try {
      const { migrateAuth } = require('./migrate-auth');
      await migrateAuth();
    } catch (error) {
      console.warn('⚠️  Warning running auth migration:', error.message);
    }

    client.release();
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  }
};

// Query helper function with retry logic
const query = async (text, params, retries = 3) => {
  const start = Date.now();
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount, attempt });
      return res;
    } catch (err) {
      lastError = err;
      console.error(`Query error (attempt ${attempt}/${retries})`, { text, error: err.message });
      
      // If it's a connection error and we have retries left, wait and try again
      if (attempt < retries && (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND' || err.message.includes('Connection terminated'))) {
        console.log(`Retrying query in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      // If it's not a connection error or we're out of retries, throw immediately
      throw err;
    }
  }
  
  throw lastError;
};

// Get client for transactions
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  initializeDatabase
};
