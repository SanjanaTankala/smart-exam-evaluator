import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { Zap, CheckCircle, XCircle, Clock, Upload } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function EvaluationPage() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [evaluating, setEvaluating] = useState({});
  const [uploading, setUploading] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExam(res.data.exam);
      setStudents(res.data.students);
    } catch (err) {
      toast.error('Failed to load');
    }
  };

  const evaluateStudent = async (roll) => {
    setEvaluating(prev => ({ ...prev, [roll]: true }));
    try {
      const res = await axios.post(`${API}/evaluate/student`, { exam_id: examId, student_roll: roll }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${roll} evaluated!`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Evaluation failed');
    } finally {
      setEvaluating(prev => ({ ...prev, [roll]: false }));
    }
  };

  const evaluateAll = async () => {
    const pending = students.filter(s => s.answer_sheet_path && !s.is_absent && !s.total_marks);
    for (const student of pending) {
      await evaluateStudent(student.student_roll);
      await new Promise(r => setTimeout(r, 1000)); // 1 second delay between evaluations
    }
    toast.success('All evaluations complete!');
  };

  const uploadOrReupload = async (roll) => {
    const file = selectedFiles[roll];
    if (!file) {
      toast.error(`Select a file for ${roll}`);
      return;
    }

    setUploading((prev) => ({ ...prev, [roll]: true }));
    try {
      const formData = new FormData();
      formData.append('exam_id', examId);
      formData.append('student_roll', roll);
      formData.append('answer_sheet', file);

      await axios.post(`${API}/students/upload-answer`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`Answer sheet saved for ${roll}`);
      setSelectedFiles((prev) => ({ ...prev, [roll]: null }));
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading((prev) => ({ ...prev, [roll]: false }));
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Evaluate Exam</h2>
            <p className="text-gray-500 text-sm mt-1">{exam?.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={evaluateAll}
              className="btn-primary flex items-center gap-2"
            >
              <Zap size={16} />
              Evaluate All
            </button>
            <button
              onClick={() => navigate(`/faculty/exam/${examId}/analysis`)}
              className="btn-secondary"
            >
              View Analysis
            </button>
          </div>
        </div>

        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Roll Number</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Sheet Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Marks</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Reupload Sheet</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-800">{student.student_roll}</td>
                  <td className="py-3">
                    {student.is_absent ? (
                      <span className="flex items-center gap-1 text-red-500 text-sm">
                        <XCircle size={14} /> Absent
                      </span>
                    ) : student.answer_sheet_path ? (
                      <span className="flex items-center gap-1 text-green-500 text-sm">
                        <CheckCircle size={14} /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock size={14} /> Not Uploaded
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    {student.total_marks != null ? (
                      <span className="font-semibold text-indigo-600">
                        {student.total_marks}/{student.max_marks}
                      </span>
                    ) : student.is_absent ? (
                      <span className="text-gray-400 text-sm">—</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not evaluated</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) =>
                          setSelectedFiles((prev) => ({
                            ...prev,
                            [student.student_roll]: e.target.files?.[0] || null
                          }))
                        }
                        className="text-xs text-gray-600"
                      />
                      <button
                        onClick={() => uploadOrReupload(student.student_roll)}
                        disabled={uploading[student.student_roll]}
                        className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 disabled:opacity-60"
                      >
                        <span className="inline-flex items-center gap-1">
                          <Upload size={12} /> {uploading[student.student_roll] ? 'Saving...' : student.answer_sheet_path ? 'Reupload' : 'Upload'}
                        </span>
                      </button>
                    </div>
                  </td>
                  <td className="py-3">
                    {!student.is_absent && student.answer_sheet_path && !student.total_marks && (
                      <button
                        onClick={() => evaluateStudent(student.student_roll)}
                        disabled={evaluating[student.student_roll]}
                        className="text-xs px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {evaluating[student.student_roll] ? (
                          <span className="flex items-center gap-1">
                            <span className="animate-spin">⟳</span> Evaluating...
                          </span>
                        ) : 'Evaluate'}
                      </button>
                    )}
                    {student.total_marks != null && (
                      <span className="text-xs text-green-600 font-medium">✓ Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}