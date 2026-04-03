import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { Upload, FileText } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function CreateExam() {
  const [form, setForm] = useState({
    name: '', semester: '', branch: '', section: '',
    roll_start: '', roll_end: '', total_marks: ''
  });
  const [questionCount, setQuestionCount] = useState(1);
  const [questionMarks, setQuestionMarks] = useState([0]);
  const [questionPaper, setQuestionPaper] = useState(null);
  const [referenceAnswer, setReferenceAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questionPaper || !referenceAnswer) {
      toast.error('Please upload both question paper and reference answer');
      return;
    }
    if (!form.total_marks || Number(form.total_marks) <= 0) {
      toast.error('Please enter valid total marks');
      return;
    }
    if (questionMarks.some((m) => Number(m) <= 0)) {
      toast.error('Each question mark must be greater than 0');
      return;
    }
    if (questionMarksSum !== Number(form.total_marks)) {
      toast.error('Sum of question-wise marks must equal total marks');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      formData.append('question_marks', JSON.stringify(questionMarks.map(Number)));
      formData.append('question_paper', questionPaper);
      formData.append('reference_answer', referenceAnswer);

      const res = await axios.post(`${API}/exams/create`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Exam created! Students auto-generated.');
      navigate(`/faculty/exam/${res.data.exam.id}/upload`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create New Exam</h2>
            <p className="text-gray-500 text-sm mt-1">Fill in details and upload documents</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/faculty/question-paper')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <FileText size={16} /> Open Question Paper Builder
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Exam Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Exam Name</label>
                <input
                  className="input-field"
                  placeholder="e.g. Mid Term Exam - Data Structures"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Semester</label>
                  <select className="select-field" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} required>
                    <option value="">Select</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Branch</label>
                  <select className="select-field" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} required>
                    <option value="">Select</option>
                    {['CSE','ECE','EEE','MECH','CIVIL'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Section</label>
                  <select className="select-field" value={form.section} onChange={e => setForm({...form, section: e.target.value})} required>
                    <option value="">Select</option>
                    {['A','B','C','D'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Roll Start</label>
                  <input
                    className="input-field"
                    placeholder="21A91A0501"
                    value={form.roll_start}
                    onChange={e => setForm({...form, roll_start: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Roll End</label>
                  <input
                    className="input-field"
                    placeholder="21A91A0560"
                    value={form.roll_end}
                    onChange={e => setForm({...form, roll_end: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    placeholder="e.g. 60"
                    value={form.total_marks}
                    onChange={e => setForm({ ...form, total_marks: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Number of Questions</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={questionCount}
                    onChange={e => updateQuestionCount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Question-wise Marks</label>
                <div className="grid grid-cols-3 gap-3">
                  {questionMarks.map((mark, index) => (
                    <div key={index}>
                      <label className="text-xs text-gray-500 block mb-1">Q{index + 1}</label>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={mark || ''}
                        onChange={(e) => updateQuestionMark(index, e.target.value)}
                        required
                      />
                    </div>
                  ))}
                </div>
                <p className={`text-xs mt-2 ${questionMarksSum === Number(form.total_marks || 0) ? 'text-green-600' : 'text-orange-600'}`}>
                  Current sum: {questionMarksSum} / Total: {Number(form.total_marks) || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Upload Documents</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Question Paper</label>
                <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${questionPaper ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-indigo-400 bg-gray-50'}`}>
                  <Upload size={24} className={questionPaper ? 'text-green-500' : 'text-gray-400'} />
                  <span className="text-xs mt-2 text-gray-500 text-center px-2">
                    {questionPaper ? questionPaper.name : 'Click to upload (JPG, PNG, PDF)'}
                  </span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setQuestionPaper(e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Reference Answer</label>
                <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${referenceAnswer ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-indigo-400 bg-gray-50'}`}>
                  <Upload size={24} className={referenceAnswer ? 'text-green-500' : 'text-gray-400'} />
                  <span className="text-xs mt-2 text-gray-500 text-center px-2">
                    {referenceAnswer ? referenceAnswer.name : 'Click to upload (JPG, PNG, PDF)'}
                  </span>
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => setReferenceAnswer(e.target.files[0])} />
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creating Exam...' : 'Create Exam & Generate Student List'}
          </button>
        </form>
      </main>
    </div>
  );
}