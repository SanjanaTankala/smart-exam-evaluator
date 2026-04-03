import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import Sidebar from '../components/Sidebar';
import { FileText, Sparkles, Download, WandSparkles } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function QuestionPaper() {
  const [form, setForm] = useState({
    paper_title: '',
    syllabus: '',
    total_marks: '',
    instructions: 'Answer all questions carefully. Write neat and concise answers.'
  });
  const [questionCount, setQuestionCount] = useState(3);
  const [questionMarks, setQuestionMarks] = useState([10, 10, 10]);
  const [loading, setLoading] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const questionMarksSum = questionMarks.reduce((sum, mark) => sum + (Number(mark) || 0), 0);

  const updateQuestionCount = (countValue) => {
    const count = Math.max(1, Number(countValue) || 1);
    setQuestionCount(count);
    setQuestionMarks((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(0);
      return next.slice(0, count);
    });
  };

  const updateQuestionMark = (index, value) => {
    setQuestionMarks((prev) => prev.map((mark, i) => (i === index ? Number(value) || 0 : mark)));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!form.syllabus.trim()) {
      toast.error('Please enter the syllabus');
      return;
    }

    if (!form.total_marks || Number(form.total_marks) <= 0) {
      toast.error('Please enter a valid total marks value');
      return;
    }

    if (questionMarks.some((mark) => Number(mark) <= 0)) {
      toast.error('Each question mark must be greater than 0');
      return;
    }

    if (questionMarksSum !== Number(form.total_marks)) {
      toast.error('Sum of question marks must match total marks');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/question-paper/generate`,
        {
          paper_title: form.paper_title,
          syllabus: form.syllabus,
          total_marks: Number(form.total_marks),
          question_marks: questionMarks.map(Number),
          instructions: form.instructions
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setGeneratedPaper(res.data.paper);
      toast.success('Question paper generated successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate question paper');
    } finally {
      setLoading(false);
    }
  };

  const downloadPaper = () => {
    if (!generatedPaper) {
      toast.error('Generate a question paper first');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 18;

    const addWrappedText = (text, fontSize = 11, lineGap = 6, bold = false, color = [25, 28, 36]) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, contentWidth);

      lines.forEach((line) => {
        if (y > pageHeight - 18) {
          doc.addPage();
          y = 18;
        }
        doc.text(line, margin, y);
        y += lineGap;
      });
    };

    const addSectionGap = (size = 4) => {
      y += size;
    };

    const paperTitle = generatedPaper.paper_title || 'Question Paper';
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(paperTitle, margin, 15);

    y = 34;
    doc.setTextColor(31, 41, 55);
    addWrappedText(`Syllabus: ${generatedPaper.syllabus || form.syllabus}`, 11, 6, true);
    addWrappedText(`Total Marks: ${generatedPaper.total_marks}`, 11, 6, true);
    addSectionGap(2);

    addWrappedText('Instructions', 12, 6, true);
    generatedPaper.instructions.forEach((instruction, index) => {
      addWrappedText(`${index + 1}. ${instruction}`, 10, 5, false);
    });
    addSectionGap(2);

    addWrappedText('Questions', 12, 6, true);
    generatedPaper.questions.forEach((question) => {
      addWrappedText(`Q${question.number}. (${question.marks} marks) ${question.question}`, 11, 6, false);
      if (question.unit) {
        addWrappedText(`Unit: ${question.unit} | Difficulty: ${question.difficulty || 'Medium'}`, 9, 5, false, [107, 114, 128]);
      }
      addSectionGap(2);
    });

    const fileName = `${(paperTitle || 'question-paper')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'question-paper'}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4 flex-col lg:flex-row lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                <WandSparkles size={14} /> AI Question Paper Builder
              </div>
              <h2 className="mt-3 text-3xl font-bold">Generate question papers from syllabus inputs</h2>
              <p className="mt-2 max-w-2xl text-sm text-indigo-100">
                Give the syllabus, marks split, and question count. The system generates a structured paper and lets you download it as a PDF.
              </p>
            </div>
            <button
              onClick={() => navigate('/faculty/create-exam')}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow hover:bg-indigo-50"
            >
              Back to Create Exam
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div className="card space-y-5">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <Sparkles size={18} /> Paper Inputs
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Paper Title</label>
                <input
                  className="input-field"
                  placeholder="e.g. Mid Term Examination - Data Structures"
                  value={form.paper_title}
                  onChange={(e) => setForm({ ...form, paper_title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Syllabus</label>
                <textarea
                  className="input-field min-h-[140px]"
                  placeholder="Enter the syllabus topics, units, or chapter names separated by commas or lines"
                  value={form.syllabus}
                  onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Instructions</label>
                <textarea
                  className="input-field min-h-[110px]"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.total_marks}
                    onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={questionCount}
                    onChange={(e) => updateQuestionCount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Question-wise Marks</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {questionMarks.map((mark, index) => (
                    <div key={index}>
                      <label className="text-xs text-gray-500 block mb-1">Q{index + 1}</label>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={mark || ''}
                        onChange={(e) => updateQuestionMark(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-2 ${questionMarksSum === Number(form.total_marks || 0) ? 'text-green-600' : 'text-orange-600'}`}>
                  Current sum: {questionMarksSum} / Total: {Number(form.total_marks) || 0}
                </p>
              </div>

              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
                <Sparkles size={16} /> {loading ? 'Generating Paper...' : 'Generate Question Paper'}
              </button>
            </div>
          </form>

          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Preview</h3>
                  <p className="text-sm text-gray-500">This is the paper that will be downloaded.</p>
                </div>
                {generatedPaper && (
                  <button
                    onClick={downloadPaper}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <Download size={16} /> Download Paper
                  </button>
                )}
              </div>

              {!generatedPaper ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                  <FileText size={42} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-gray-700">No paper generated yet</p>
                  <p className="mt-1 text-sm">Complete the form and generate a paper to preview it here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-indigo-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-indigo-500">Paper Title</p>
                    <h4 className="text-xl font-bold text-gray-800">{generatedPaper.paper_title}</h4>
                    <p className="mt-1 text-sm text-gray-600">{generatedPaper.syllabus}</p>
                    <p className="mt-2 text-sm font-medium text-indigo-700">Total Marks: {generatedPaper.total_marks}</p>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold text-gray-800">Instructions</h4>
                    <ul className="space-y-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                      {generatedPaper.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="font-semibold text-indigo-600">{index + 1}.</span>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    {generatedPaper.questions.map((question) => (
                      <div key={question.number} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Question {question.number}</p>
                            <p className="mt-1 text-sm leading-6 text-gray-700">{question.question}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {question.marks} marks
                          </span>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          {question.unit} {question.difficulty ? `• ${question.difficulty}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}