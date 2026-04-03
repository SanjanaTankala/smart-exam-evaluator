const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Create exam
router.post('/create', auth, upload.fields([
  { name: 'question_paper', maxCount: 1 },
  { name: 'reference_answer', maxCount: 1 }
]), async (req, res) => {
  const { name, semester, branch, section, roll_start, roll_end, total_marks, question_marks } = req.body;
  const question_paper_path = req.files['question_paper']?.[0]?.path || null;
  const reference_answer_path = req.files['reference_answer']?.[0]?.path || null;

  try {
    const parsedQuestionMarks = JSON.parse(question_marks || '[]');
    const parsedTotalMarks = Number(total_marks);

    if (!Array.isArray(parsedQuestionMarks) || parsedQuestionMarks.length === 0) {
      return res.status(400).json({ error: 'Question-wise marks are required' });
    }
    if (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks <= 0) {
      return res.status(400).json({ error: 'Total marks must be a positive number' });
    }

    const hasInvalidQuestionMark = parsedQuestionMarks.some((m) => !Number.isFinite(Number(m)) || Number(m) <= 0);
    if (hasInvalidQuestionMark) {
      return res.status(400).json({ error: 'Each question mark must be a positive number' });
    }

    const sumQuestionMarks = parsedQuestionMarks.reduce((sum, m) => sum + Number(m), 0);
    if (sumQuestionMarks !== parsedTotalMarks) {
      return res.status(400).json({ error: 'Total marks must equal sum of question-wise marks' });
    }

    const result = await pool.query(
      `INSERT INTO exams (name, semester, branch, section, roll_start, roll_end, question_paper_path, reference_answer_path, faculty_id, total_marks, question_marks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        name,
        semester,
        branch,
        section,
        roll_start,
        roll_end,
        question_paper_path,
        reference_answer_path,
        req.user.id,
        parsedTotalMarks,
        JSON.stringify(parsedQuestionMarks.map(Number))
      ]
    );

    const exam = result.rows[0];

    // Auto-generate student records from roll range
    const startNum = parseInt(roll_start.replace(/\D/g, ''));
    const endNum = parseInt(roll_end.replace(/\D/g, ''));
    const prefix = roll_start.replace(/\d/g, '');

    for (let i = startNum; i <= endNum; i++) {
      const roll = prefix + String(i).padStart(roll_start.length - prefix.length, '0');
      await pool.query(
        'INSERT INTO student_exams (exam_id, student_roll) VALUES ($1, $2)',
        [exam.id, roll]
      );
    }

    res.json({ message: 'Exam created successfully', exam });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all exams for faculty
router.get('/list', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM exams WHERE faculty_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get exam details with student list
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await pool.query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    const students = await pool.query(
      'SELECT * FROM student_exams WHERE exam_id = $1 ORDER BY student_roll',
      [req.params.id]
    );
    res.json({ exam: exam.rows[0], students: students.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete exam (and related student records)
router.delete('/:id', auth, async (req, res) => {
  const examId = req.params.id;

  try {
    const examResult = await pool.query(
      'SELECT * FROM exams WHERE id = $1 AND faculty_id = $2',
      [examId, req.user.id]
    );

    if (examResult.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found or access denied' });
    }

    const studentFiles = await pool.query(
      'SELECT answer_sheet_path FROM student_exams WHERE exam_id = $1 AND answer_sheet_path IS NOT NULL',
      [examId]
    );

    const exam = examResult.rows[0];
    const filesToDelete = [
      exam.question_paper_path,
      exam.reference_answer_path,
      ...studentFiles.rows.map((row) => row.answer_sheet_path)
    ].filter(Boolean);

    await pool.query('DELETE FROM exams WHERE id = $1 AND faculty_id = $2', [examId, req.user.id]);

    filesToDelete.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.error('Failed deleting file:', filePath, fileErr.message);
      }
    });

    res.json({ message: 'Exam deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard stats
router.get('/stats/dashboard', auth, async (req, res) => {
  try {
    const exams = await pool.query(
      'SELECT COUNT(*) as total_exams FROM exams WHERE faculty_id = $1',
      [req.user.id]
    );
    const students = await pool.query(
      `SELECT COUNT(*) as total_students FROM student_exams se
       JOIN exams e ON se.exam_id = e.id WHERE e.faculty_id = $1`,
      [req.user.id]
    );
    const avgMarks = await pool.query(
      `SELECT AVG(CAST(se.total_marks AS FLOAT) / NULLIF(se.max_marks, 0) * 100) as avg_percentage
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE e.faculty_id = $1 AND se.total_marks IS NOT NULL`,
      [req.user.id]
    );
    res.json({
      total_exams: exams.rows[0].total_exams,
      total_students: students.rows[0].total_students,
      avg_percentage: Math.round(avgMarks.rows[0].avg_percentage || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;