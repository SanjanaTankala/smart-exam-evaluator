const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const auth = require('../middleware/auth');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_GEMINI_MODEL = (process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite').replace(/^models\//, '');
const FALLBACK_GEMINI_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash,gemini-flash-lite-latest')
  .split(',')
  .map((m) => m.trim().replace(/^models\//, ''))
  .filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaOrRateLimitError(err) {
  const text = `${err?.message || ''} ${err?.toString?.() || ''}`.toLowerCase();
  return text.includes('429') || text.includes('quota exceeded') || text.includes('rate limit');
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

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  return [];
}

function parseJsonBlock(text) {
  const match = `${text || ''}`.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Gemini did not return a JSON object');
  }

  return JSON.parse(match[0]);
}

function normalizeQuestionPaper(output, syllabus, questionMarks, totalMarks, paperTitle) {
  const safeQuestionMarks = questionMarks.map((mark) => Number(mark) || 0).filter((mark) => mark > 0);
  const generatedQuestions = Array.isArray(output?.questions) ? output.questions : [];

  const questions = safeQuestionMarks.map((mark, index) => {
    const aiQuestion = generatedQuestions[index] || {};
    return {
      number: index + 1,
      question: aiQuestion.question || `Write a detailed answer on ${syllabus.split(',')[index]?.trim() || syllabus}.`,
      marks: mark,
      unit: aiQuestion.unit || `Q${index + 1}`,
      difficulty: aiQuestion.difficulty || 'Medium'
    };
  });

  const computedTotal = questions.reduce((sum, question) => sum + question.marks, 0);

  return {
    paper_title: output?.paper_title || paperTitle || 'Question Paper',
    subject: output?.subject || paperTitle || 'Question Paper',
    syllabus,
    instructions: Array.isArray(output?.instructions)
      ? output.instructions
      : [
          'Answer all questions carefully.',
          'Write answers clearly and support them with relevant examples where needed.'
        ],
    questions,
    total_marks: computedTotal || Number(totalMarks) || computedTotal,
    generated_for: output?.generated_for || 'Faculty use'
  };
}

router.post('/generate', auth, async (req, res) => {
  const { paper_title, syllabus, total_marks, question_marks, instructions } = req.body;

  const parsedMarks = toArray(question_marks).map((mark) => Number(mark)).filter((mark) => Number.isFinite(mark) && mark > 0);
  const parsedTotalMarks = Number(total_marks);
  const cleanSyllabus = `${syllabus || ''}`.trim();
  const cleanTitle = `${paper_title || 'Question Paper'}`.trim();

  if (!cleanSyllabus) {
    return res.status(400).json({ error: 'Syllabus is required' });
  }

  if (!parsedMarks.length) {
    return res.status(400).json({ error: 'Question-wise marks are required' });
  }

  if (!Number.isFinite(parsedTotalMarks) || parsedTotalMarks <= 0) {
    return res.status(400).json({ error: 'Total marks must be a positive number' });
  }

  const marksSum = parsedMarks.reduce((sum, mark) => sum + mark, 0);
  if (marksSum !== parsedTotalMarks) {
    return res.status(400).json({ error: 'Total marks must equal the sum of question-wise marks' });
  }

  const prompt = `You are an expert university faculty member creating an exam question paper.

Create a question paper from the syllabus below.

Requirements:
- Paper title: ${cleanTitle}
- Syllabus: ${cleanSyllabus}
- Total marks: ${parsedTotalMarks}
- Number of questions: ${parsedMarks.length}
- Question-wise marks: ${parsedMarks.map((mark, index) => `Q${index + 1}:${mark}`).join(', ')}
- Use the syllabus meaningfully and spread the questions across the topics.
- Make the paper suitable for faculty use and ready for students.
- Do not include answers or explanations.
- Return JSON only.

Return this exact JSON structure:
{
  "paper_title": "${cleanTitle}",
  "subject": "${cleanTitle}",
  "generated_for": "Faculty use",
  "instructions": ["Instruction 1", "Instruction 2"],
  "questions": [
    {
      "number": 1,
      "question": "Question text",
      "marks": ${parsedMarks[0]},
      "unit": "Unit name",
      "difficulty": "Easy | Medium | Hard"
    }
  ]
}`;

  try {
    const result = await generateContentWithFallback([
      { text: prompt },
      { text: `Additional instructions from faculty: ${instructions || 'None'}` }
    ]);

    const responseText = result.response.text();
    let generatedPaper;

    try {
      generatedPaper = normalizeQuestionPaper(
        parseJsonBlock(responseText),
        cleanSyllabus,
        parsedMarks,
        parsedTotalMarks,
        cleanTitle
      );
    } catch (parseErr) {
      return res.status(500).json({ error: 'Failed to parse AI response', raw: responseText });
    }

    res.json({ message: 'Question paper generated successfully', paper: generatedPaper });
  } catch (err) {
    console.error('Question paper generation error:', err);
    if (isQuotaOrRateLimitError(err)) {
      return res.status(429).json({
        error: 'Gemini quota/rate limit reached. Please retry after 1-2 minutes, or switch to a lower-cost model in GEMINI_MODEL.'
      });
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;