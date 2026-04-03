import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function AnalysisPage() {
  const { examId } = useParams();
  const [students, setStudents] = useState([]);
  const [exam, setExam] = useState(null);
  const [dist, setDist] = useState({ distribution: [], average: 0, highest: 0, lowest: 0 });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [examRes, distRes] = await Promise.all([
        axios.get(`${API}/exams/${examId}`, { headers }),
        axios.get(`${API}/evaluate/distribution/${examId}`, { headers })
      ]);
      setExam(examRes.data.exam);
      setStudents(examRes.data.students.filter(s => s.total_marks != null));
      setDist(distRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = dist.distribution.map(s => ({
    roll: s.student_roll.slice(-4),
    marks: s.total_marks
  }));

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Analysis & Results</h2>
          <p className="text-gray-500 text-sm mt-1">{exam?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Class Average', value: dist.average, color: 'text-blue-600' },
            { label: 'Highest Marks', value: dist.highest, color: 'text-green-600' },
            { label: 'Lowest Marks', value: dist.lowest, color: 'text-red-500' },
          ].map((stat, i) => (
            <div key={i} className="card text-center">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        {chartData.length > 0 && (
          <div className="card mb-8">
            <h3 className="font-semibold text-gray-700 mb-4">Marks Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="roll" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="marks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-student Results */}
        <div className="space-y-4">
          {students.map(student => {
            const topics = student.suggested_topics
              ? (typeof student.suggested_topics === 'string'
                  ? JSON.parse(student.suggested_topics)
                  : student.suggested_topics)
              : [];

            return (
              <div key={student.id} className="card">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-800">{student.student_roll}</h4>
                  <div className="text-lg font-bold text-indigo-600">
                    {student.total_marks}/{student.max_marks}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-green-600 font-medium text-sm mb-1">
                      <TrendingUp size={14} /> Strengths
                    </div>
                    <p className="text-xs text-gray-600">{student.strengths || '—'}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-red-500 font-medium text-sm mb-1">
                      <AlertCircle size={14} /> Weak Areas
                    </div>
                    <p className="text-xs text-gray-600">{student.weak_areas || '—'}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-1">
                      <BookOpen size={14} /> Suggestions
                    </div>
                    {topics.slice(0, 3).map((topic, i) => (
                      <a
                        key={i}
                        href={`https://www.google.com/search?q=${encodeURIComponent(topic)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline block"
                      >
                        <ExternalLink size={10} /> {topic}
                      </a>
                    ))}
                  </div>
                </div>

                {student.feedback && (
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{student.feedback}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}