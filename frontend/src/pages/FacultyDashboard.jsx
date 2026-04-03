import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { Users, BookOpen, TrendingUp, Trash2, FileText } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function FacultyDashboard() {
  const [stats, setStats] = useState({ total_exams: 0, total_students: 0, avg_percentage: 0 });
  const [exams, setExams] = useState([]);
  const [deletingExamId, setDeletingExamId] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) return navigate('/login');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, examsRes] = await Promise.all([
        axios.get(`${API}/exams/stats/dashboard`, { headers }),
        axios.get(`${API}/exams/list`, { headers })
      ]);
      setStats(statsRes.data);
      setExams(examsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExam = async (examId, examName) => {
    const ok = window.confirm(`Delete exam "${examName}"? This will remove all student uploads and evaluation data for this exam.`);
    if (!ok) return;

    setDeletingExamId(examId);
    try {
      await axios.delete(`${API}/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Exam deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete exam');
    } finally {
      setDeletingExamId(null);
    }
  };

  const cards = [
    { label: 'Total Exams', value: stats.total_exams, icon: <BookOpen size={20} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Students', value: stats.total_students, icon: <Users size={20} />, color: 'text-green-600 bg-green-50' },
    { label: 'Avg Performance', value: `${stats.avg_percentage}%`, icon: <TrendingUp size={20} />, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user.name || 'Faculty'} 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Here's your teaching overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {cards.map((card, i) => (
            <div key={i} className="card flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Exams Table */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Recent Exams</h3>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/faculty/question-paper')}
                className="text-sm py-2 px-4 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 inline-flex items-center gap-2"
              >
                <FileText size={16} /> Question Paper
              </button>
              <button
                onClick={() => navigate('/faculty/create-exam')}
                className="btn-primary text-sm py-2 px-4"
              >
                + New Exam
              </button>
            </div>
          </div>

          {exams.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
              <p>No exams created yet. Create your first exam!</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Exam Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Sem/Branch/Sec</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Roll Range</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {exams.map(exam => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{exam.name}</td>
                    <td className="py-3 text-gray-600 text-sm">{exam.semester} / {exam.branch} / {exam.section}</td>
                    <td className="py-3 text-gray-600 text-sm">{exam.roll_start} - {exam.roll_end}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/faculty/exam/${exam.id}/upload`)}
                          className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100"
                        >
                          Upload Sheets
                        </button>
                        <button
                          onClick={() => navigate(`/faculty/exam/${exam.id}/evaluate`)}
                          className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg font-medium hover:bg-purple-100"
                        >
                          Evaluate
                        </button>
                        <button
                          onClick={() => navigate(`/faculty/exam/${exam.id}/analysis`)}
                          className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100"
                        >
                          Analysis
                        </button>
                        <button
                          onClick={() => deleteExam(exam.id, exam.name)}
                          disabled={deletingExamId === exam.id}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 disabled:opacity-60"
                        >
                          <span className="inline-flex items-center gap-1">
                            <Trash2 size={12} /> {deletingExamId === exam.id ? 'Deleting...' : 'Delete'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}