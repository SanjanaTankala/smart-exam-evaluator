const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload student answer sheet
router.post('/upload-answer', auth, upload.single('answer_sheet'), async (req, res) => {
  const { exam_id, student_roll } = req.body;
  const answer_sheet_path = req.file?.path;

  try {
    await pool.query(
      `UPDATE student_exams SET
         answer_sheet_path = $1,
         is_absent = FALSE,
         total_marks = NULL,
         max_marks = NULL,
         question_wise_marks = NULL,
         feedback = NULL,
         strengths = NULL,
         weak_areas = NULL,
         suggested_topics = NULL,
         evaluated_at = NULL
       WHERE exam_id = $2 AND student_roll = $3`,
      [answer_sheet_path, exam_id, student_roll]
    );
    res.json({ message: 'Answer sheet uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark student as absent
router.post('/mark-absent', auth, async (req, res) => {
  const { exam_id, student_roll } = req.body;
  try {
    await pool.query(
      `UPDATE student_exams SET is_absent = TRUE, answer_sheet_path = NULL
       WHERE exam_id = $1 AND student_roll = $2`,
      [exam_id, student_roll]
    );
    res.json({ message: 'Marked as absent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get student results (for student dashboard)
router.get('/results', auth, async (req, res) => {
  const { roll, semester, branch, section } = req.user;
  try {
    const result = await pool.query(
      `SELECT se.*, e.name as exam_name, e.semester, e.branch, e.section
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE se.student_roll = $1 AND e.semester = $2 AND e.branch = $3 AND e.section = $4
       ORDER BY se.created_at DESC`,
      [roll, semester, branch, section]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;