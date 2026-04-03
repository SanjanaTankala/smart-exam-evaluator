const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureSchema() {
  try {
    await pool.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks INTEGER');
    await pool.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS question_marks JSONB');
  } catch (err) {
    console.error('Schema update error:', err.message);
  }
}

pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✅ Connected to PostgreSQL');
    ensureSchema();
  }
});

module.exports = pool;