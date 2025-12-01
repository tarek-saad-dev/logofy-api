const { Pool } = require('pg');
require('dotenv').config();

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  console.error('   Please check your .env file and ensure DATABASE_URL is defined');
  process.exit(1);
}

// Log connection info (without sensitive data)
const dbUrl = process.env.DATABASE_URL;
const dbUrlInfo = dbUrl.replace(/:[^:@]+@/, ':****@'); // Mask password
console.log('📊 Database URL:', dbUrlInfo.substring(0, 100) + '...');

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') ? {
    rejectUnauthorized: false,
    require: true
  } : {
    rejectUnauthorized: false
  },
  // Connection pool settings for better stability
  max: 10, // Maximum number of clients in the pool (reduced for stability)
  min: 1,  // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 30000, // Return an error after 30 seconds if connection could not be established (increased for Neon)
  maxUses: 1000, // Close (and replace) a connection after it has been used 1000 times
  allowExitOnIdle: false, // Don't allow the pool to close all connections when idle
  // Additional settings for Neon/cloud databases
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
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

// Test database connection with retry logic
const testConnection = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting database connection (${attempt}/${retries})...`);
      const client = await pool.connect();
      // Test with a simple query
      await client.query('SELECT NOW()');
      console.log('✅ Database connected successfully');
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ Database connection failed (attempt ${attempt}/${retries}):`, err.message);
      
      // If it's a timeout or connection error and we have retries left, wait and try again
      if (attempt < retries && (
        err.message.includes('timeout') || 
        err.message.includes('Connection terminated') ||
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNREFUSED'
      )) {
        const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
        console.log(`Retrying connection in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // If it's the last attempt or not a retryable error, return false
      if (attempt === retries) {
        console.error('❌ All connection attempts failed. Please check:');
        console.error('   1. DATABASE_URL is correct in .env file');
        console.error('   2. Database server is accessible');
        console.error('   3. Network/firewall allows connections');
        console.error('   4. SSL settings are correct');
        return false;
      }
    }
  }
  return false;
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

    // Check if users table exists and has correct schema
    const checkUsersTable = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    if (checkUsersTable.rows.length > 0) {
      // Check if password_hash column exists
      const hasPasswordHash = checkUsersTable.rows.some(r => r.column_name === 'password_hash');
      const hasId = checkUsersTable.rows.some(r => r.column_name === 'id');
      const idType = checkUsersTable.rows.find(r => r.column_name === 'id');
      
      // If users table exists but doesn't have password_hash, run auth migration
      if (!hasPasswordHash) {
        try {
          const { migrateAuth } = require('./migrate-auth');
          await migrateAuth();
        } catch (error) {
          console.warn('⚠️  Warning running auth migration:', error.message);
        }
      }
    } else {
      // Users table doesn't exist, run auth migration to create it
      try {
        const { migrateAuth } = require('./migrate-auth');
        await migrateAuth();
      } catch (error) {
        console.warn('⚠️  Warning running auth migration:', error.message);
      }
    }

    // Run refresh tokens migration (always run - it's idempotent)
    try {
      const { migrateRefreshTokens } = require('./migrate-refresh-tokens');
      await migrateRefreshTokens();
    } catch (error) {
      console.error('❌ Error running refresh tokens migration:', error.message);
      // Don't throw - allow server to start, but log the error
      // The migration can be run manually if needed
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
