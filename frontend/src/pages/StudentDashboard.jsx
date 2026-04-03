import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, TrendingUp, AlertCircle, LogOut, ExternalLink } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function StudentDashboard() {
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) return navigate('/login');
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await axios.get(`${API}/students/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen size={16} color="white" />
          </div>
          <h1 className="font-bold text-gray-800">Smart Exam Evaluator</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Roll: <span className="font-semibold">{user.roll}</span> •
            {user.semester} Sem / {user.branch} / {user.section}
          </div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">My Results</h2>

        {results.length === 0 ? (
          <div className="card text-center py-16 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p>No results available yet. Check back after evaluation.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {results.map(result => {
              const topics = result.suggested_topics
                ? (typeof result.suggested_topics === 'string'
                    ? JSON.parse(result.suggested_topics)
                    : result.suggested_topics)
                : [];

              const percentage = result.max_marks
                ? Math.round((result.total_marks / result.max_marks) * 100)
                : 0;

              return (
                <div key={result.id} className="card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelected(selected === result.id ? null : result.id)}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-800">{result.exam_name}</h3>
                      <p className="text-sm text-gray-500">{result.semester} Sem / {result.branch} / {result.section}</p>
                    </div>
                    {result.total_marks != null ? (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">
                          {result.total_marks}/{result.max_marks}
                        </div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                        <div className="w-24 bg-gray-100 rounded-full h-2 mt-1">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-yellow-500 bg-yellow-50 px-3 py-1 rounded-full">Pending</span>
                    )}
                  </div>

                  {selected === result.id && result.total_marks != null && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{result.feedback}</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 rounded-xl p-3">
                          <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-1">
                            <TrendingUp size={12} /> Strengths
                          </div>
                          <p className="text-xs text-gray-600">{result.strengths}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3">
                          <div className="flex items-center gap-1 text-red-500 text-xs font-medium mb-1">
                            <AlertCircle size={12} /> Weak Areas
                          </div>
                          <p className="text-xs text-gray-600">{result.weak_areas}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <div className="flex items-center gap-1 text-blue-600 text-xs font-medium mb-1">
                            <BookOpen size={12} /> Study Links
                          </div>
                          {topics.slice(0, 3).map((t, i) => (
                            <a
                              key={i}
                              href={`https://www.google.com/search?q=${encodeURIComponent(t)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-500 hover:underline block"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink size={10} /> {t}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}