const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite').replace(/^models\//, '');
const FALLBACK_GEMINI_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash,gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim().replace(/^models\//, ''))
  .filter(Boolean);

function isQuotaOrRateLimitError(err) {
  const text = `${err?.message || ''} ${err?.toString?.() || ''}`.toLowerCase();
  return text.includes('429') || text.includes('quota exceeded') || text.includes('rate limit');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithFallback(contents) {
  const modelsToTry = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );
  let lastError;

  for (const modelName of modelsToTry) {
    const model = genAI.getGenerativeModel({ model: modelName });

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await model.generateContent(contents);
      } catch (err) {
        lastError = err;
        if (!isQuotaOrRateLimitError(err) || attempt === 2) {
          break;
        }
        await sleep(2000 * attempt);
      }
    }
  }

  throw lastError;
}

// Helper: convert file to base64
function fileToBase64(filePath) {
  const absolutePath = path.resolve(filePath);
  const data = fs.readFileSync(absolutePath);
  return data.toString('base64');
}

// Helper: get mime type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

function normalizeEvaluation(evaluation, questionMarks, totalMarks) {
  const safeQuestionMarks = Array.isArray(questionMarks) ? questionMarks.map((m) => Number(m) || 0) : [];
  const safeTotalMarks = Number(totalMarks) || safeQuestionMarks.reduce((sum, m) => sum + m, 0);
  const aiQuestionWise = Array.isArray(evaluation?.question_wise_marks) ? evaluation.question_wise_marks : [];

  const normalizedQuestionWise = safeQuestionMarks.map((maxMark, idx) => {
    const aiRow = aiQuestionWise[idx] || {};
    const obtainedRaw = Number(aiRow.obtained_marks ?? 0);
    const obtained = Math.min(Math.max(obtainedRaw, 0), maxMark);
    return {
      question: aiRow.question || `Q${idx + 1}`,
      max_marks: maxMark,
      obtained_marks: obtained,
      comment: aiRow.comment || 'Evaluated based on answer quality and completeness.'
    };
  });

  const computedTotal = normalizedQuestionWise.reduce((sum, row) => sum + row.obtained_marks, 0);

  return {
    question_wise_marks: normalizedQuestionWise,
    total_marks: Math.min(computedTotal, safeTotalMarks),
    max_marks: safeTotalMarks,
    feedback: evaluation?.feedback || '',
    strengths: evaluation?.strengths || '',
    weak_areas: evaluation?.weak_areas || '',
    suggested_topics: Array.isArray(evaluation?.suggested_topics) ? evaluation.suggested_topics : []
  };
}

// Evaluate a single student
router.post('/student', auth, async (req, res) => {
  const { exam_id, student_roll } = req.body;

  try {
    // Get student exam record
    const studentResult = await pool.query(
      'SELECT * FROM student_exams WHERE exam_id = $1 AND student_roll = $2',
      [exam_id, student_roll]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const studentExam = studentResult.rows[0];

    if (studentExam.is_absent) {
      return res.status(400).json({ error: 'Student is marked absent' });
    }

    if (!studentExam.answer_sheet_path) {
      return res.status(400).json({ error: 'No answer sheet uploaded' });
    }

    // Get exam with reference answer
    const examResult = await pool.query('SELECT * FROM exams WHERE id = $1', [exam_id]);
    const exam = examResult.rows[0];

    if (!exam.reference_answer_path) {
      return res.status(400).json({ error: 'No reference answer uploaded for this exam' });
    }

    const questionMarks = Array.isArray(exam.question_marks)
      ? exam.question_marks.map((m) => Number(m))
      : [];
    const examTotalMarks = Number(exam.total_marks) || questionMarks.reduce((sum, m) => sum + m, 0);

    if (!questionMarks.length || !examTotalMarks) {
      return res.status(400).json({
        error: 'This exam does not have total/question-wise marks configured. Edit/create exam with marks configuration first.'
      });
    }

    // Prepare images for Gemini
    const answerBase64 = fileToBase64(studentExam.answer_sheet_path);
    const referenceBase64 = fileToBase64(exam.reference_answer_path);
    const answerMime = getMimeType(studentExam.answer_sheet_path);
    const refMime = getMimeType(exam.reference_answer_path);

    const prompt = `You are an expert university exam evaluator.

You will be given 2 images:
1. The reference answer sheet with the expected correct answers.
2. The student's answer sheet.

You MUST compare the student's answers only against the reference answer sheet.
Do NOT reward answers that are only vaguely related, partially correct in wording, or generally on-topic but mathematically/conceptually wrong.
Be conservative: if the student's answer is incomplete, incorrect, or does not clearly match the reference, award low marks or 0.

Exam constraints you MUST follow:
- Total exam marks = ${examTotalMarks}
- Question-wise max marks = ${questionMarks.map((m, i) => `Q${i + 1}:${m}`).join(', ')}
- Use EXACTLY ${questionMarks.length} entries in question_wise_marks
- obtained_marks for each question must be between 0 and its max_marks
- total_marks must be the sum of obtained_marks
- max_marks must be ${examTotalMarks}
- Never award more than the question's max marks
- Prefer under-scoring over over-scoring when the answer quality is ambiguous

Scoring rules:
- Full marks only when the student's answer clearly matches the reference in concept and key points.
- Partial marks only when some core idea is correct but details are missing.
- Give 0 when the answer is wrong, off-topic, or lacks the required concept.
- Comments should briefly explain why marks were awarded or deducted.

Return JSON only, with this exact structure:
{
  "question_wise_marks": [
    {"question": "Q1", "max_marks": ${questionMarks[0]}, "obtained_marks": 0, "comment": ""}
  ],
  "total_marks": 0,
  "max_marks": ${examTotalMarks},
  "feedback": "Brief overall feedback focused on correctness and gaps.",
  "strengths": "What the student did correctly, if anything.",
  "weak_areas": "Main mistakes, missing points, or misconceptions.",
  "suggested_topics": ["Topic 1 to revise", "Topic 2 to revise", "Topic 3 to revise"]
}

Keep the evaluation strict and academic.`;

    const result = await generateContentWithFallback([
      { text: prompt },
      {
        inlineData: {
          mimeType: refMime,
          data: referenceBase64
        }
      },
      {
        inlineData: {
          mimeType: answerMime,
          data: answerBase64
        }
      }
    ]);

    const responseText = result.response.text();
    
    // Parse JSON from Gemini response
    let evaluation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      evaluation = normalizeEvaluation(JSON.parse(jsonMatch[0]), questionMarks, examTotalMarks);
    } catch (parseErr) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: responseText });
    }

    // Generate search links for suggested topics
    const searchLinks = (evaluation.suggested_topics || []).slice(0, 3).map(topic => ({
      topic,
      url: `https://www.google.com/search?q=${encodeURIComponent(topic + ' tutorial')}`
    }));

    // Save to database
    await pool.query(
      `UPDATE student_exams SET
        total_marks = $1, max_marks = $2, question_wise_marks = $3,
        feedback = $4, strengths = $5, weak_areas = $6,
        suggested_topics = $7, evaluated_at = NOW()
       WHERE exam_id = $8 AND student_roll = $9`,
      [
        evaluation.total_marks,
        evaluation.max_marks,
        JSON.stringify(evaluation.question_wise_marks),
        evaluation.feedback,
        evaluation.strengths,
        evaluation.weak_areas,
        JSON.stringify(evaluation.suggested_topics),
        exam_id,
        student_roll
      ]
    );

    res.json({ ...evaluation, search_links: searchLinks, message: 'Evaluation complete' });

  } catch (err) {
    console.error('Evaluation error:', err);
    if (isQuotaOrRateLimitError(err)) {
      return res.status(429).json({
        error: 'Gemini quota/rate limit reached. Please retry after 1-2 minutes, or switch to a lower-cost model in GEMINI_MODEL.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Evaluate all students in an exam
router.post('/all', auth, async (req, res) => {
  const { exam_id } = req.body;

  try {
    const students = await pool.query(
      `SELECT * FROM student_exams WHERE exam_id = $1 AND is_absent = FALSE AND answer_sheet_path IS NOT NULL`,
      [exam_id]
    );

    if (students.rows.length === 0) {
      return res.status(400).json({ error: 'No answer sheets to evaluate' });
    }

    res.json({ message: `Starting evaluation for ${students.rows.length} students`, count: students.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get marks distribution for charts
router.get('/distribution/:exam_id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT student_roll, total_marks, max_marks FROM student_exams 
       WHERE exam_id = $1 AND total_marks IS NOT NULL`,
      [req.params.exam_id]
    );
    
    const stats = result.rows;
    const marks = stats.map(s => s.total_marks);
    
    res.json({
      distribution: stats,
      average: marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : 0,
      highest: marks.length ? Math.max(...marks) : 0,
      lowest: marks.length ? Math.min(...marks) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;