const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// Faculty Login
router.post('/faculty/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'faculty']
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student Login
router.post('/student/login', async (req, res) => {
  const { semester, branch, section, roll_number } = req.body;
  try {
    // Check if student has any exam results
    const result = await pool.query(
      `SELECT se.*, e.name as exam_name, e.semester, e.branch, e.section
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE se.student_roll = $1 AND e.semester = $2 AND e.branch = $3 AND e.section = $4`,
      [roll_number, semester, branch, section]
    );
    
    // Create a simple token for student
    const token = jwt.sign(
      { roll: roll_number, semester, branch, section, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { roll: roll_number, semester, branch, section, role: 'student' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;