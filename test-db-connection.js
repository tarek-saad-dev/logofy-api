/**
 * Database Connection Test Script
 * 
 * This script helps diagnose database connection issues.
 * Run with: node test-db-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Database Connection Diagnostic Tool\n');
console.log('=' .repeat(50));

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file');
  process.exit(1);
}

// Mask password in URL for logging
const dbUrl = process.env.DATABASE_URL;
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
console.log('📋 DATABASE_URL:', maskedUrl.substring(0, 100) + '...');
console.log('');

// Parse connection string to check format
try {
  const url = new URL(dbUrl);
  console.log('✅ Connection string format is valid');
  console.log('   Protocol:', url.protocol);
  console.log('   Host:', url.hostname);
  console.log('   Port:', url.port || 'default (5432)');
  console.log('   Database:', url.pathname.substring(1));
  console.log('   SSL Mode:', url.searchParams.get('sslmode') || 'not specified');
  console.log('');
} catch (err) {
  console.error('❌ Invalid connection string format:', err.message);
  process.exit(1);
}

// Test connection with different configurations
const configs = [
  {
    name: 'Standard Configuration',
    config: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 30000
    }
  },
  {
    name: 'Neon-optimized Configuration',
    config: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
        require: true
      },
      connectionTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    }
  }
];

async function testConnection(config, configName) {
  console.log(`\n🧪 Testing: ${configName}`);
  console.log('-'.repeat(50));
  
  const pool = new Pool(config);
  
  try {
    const startTime = Date.now();
    const client = await pool.connect();
    const connectTime = Date.now() - startTime;
    
    console.log(`✅ Connection successful (${connectTime}ms)`);
    
    // Test query
    const queryStart = Date.now();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    const queryTime = Date.now() - queryStart;
    
    console.log(`✅ Query successful (${queryTime}ms)`);
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.substring(0, 50)}...`);
    
    client.release();
    await pool.end();
    
    return true;
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    console.error(`   Error code: ${err.code || 'N/A'}`);
    console.error(`   Error type: ${err.constructor.name}`);
    
    if (err.message.includes('timeout')) {
      console.error('   💡 This is a timeout error. Possible causes:');
      console.error('      - Network latency');
      console.error('      - Firewall blocking connection');
      console.error('      - Database server is down or slow');
      console.error('      - Connection string is incorrect');
    }
    
    if (err.message.includes('password')) {
      console.error('   💡 This is an authentication error. Check:');
      console.error('      - Username and password in DATABASE_URL');
      console.error('      - Database user permissions');
    }
    
    if (err.message.includes('SSL')) {
      console.error('   💡 This is an SSL error. Check:');
      console.error('      - SSL settings in connection string');
      console.error('      - SSL certificate validity');
    }
    
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return false;
  }
}

// Run tests
(async () => {
  let success = false;
  
  for (const { name, config } of configs) {
    const result = await testConnection(config, name);
    if (result) {
      success = true;
      console.log(`\n✅ Found working configuration: ${name}`);
      break;
    }
    
    // Wait between tests
    if (configs.indexOf({ name, config }) < configs.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('✅ Database connection test PASSED');
    console.log('   Your database is accessible and working correctly.');
  } else {
    console.log('❌ Database connection test FAILED');
    console.log('\n💡 Troubleshooting steps:');
    console.log('   1. Verify DATABASE_URL in .env file is correct');
    console.log('   2. Check if database server is running and accessible');
    console.log('   3. Verify network/firewall allows connections');
    console.log('   4. For Neon databases, check if the connection string uses the pooler endpoint');
    console.log('   5. Try connecting with a database client (pgAdmin, DBeaver) to verify credentials');
    process.exit(1);
  }
})();


