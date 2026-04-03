import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { Upload, UserX, CheckCircle } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function StudentUpload() {
  const { examId } = useParams();
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [uploading, setUploading] = useState({});
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
      toast.error('Failed to load exam');
    }
  };

  const uploadAnswer = async (roll, file) => {
    setUploading(prev => ({ ...prev, [roll]: true }));
    try {
      const formData = new FormData();
      formData.append('exam_id', examId);
      formData.append('student_roll', roll);
      formData.append('answer_sheet', file);
      await axios.post(`${API}/students/upload-answer`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Uploaded for ${roll}`);
      fetchData();
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [roll]: false }));
    }
  };

  const markAbsent = async (roll) => {
    try {
      await axios.post(`${API}/students/mark-absent`, { exam_id: examId, student_roll: roll }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${roll} marked absent`);
      fetchData();
    } catch (err) {
      toast.error('Failed to mark absent');
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Upload Answer Sheets</h2>
            <p className="text-gray-500 text-sm mt-1">{exam?.name} • {exam?.semester} Sem / {exam?.branch} / {exam?.section}</p>
          </div>
          <button
            onClick={() => navigate(`/faculty/exam/${examId}/evaluate`)}
            className="btn-primary"
          >
            Go to Evaluate →
          </button>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">Student List ({students.length} students)</h3>
            <div className="text-sm text-gray-500">
              Uploaded: {students.filter(s => s.answer_sheet_path).length} |
              Absent: {students.filter(s => s.is_absent).length} |
              Pending: {students.filter(s => !s.answer_sheet_path && !s.is_absent).length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Roll Number</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map(student => (
                  <tr key={student.id} className={`hover:bg-gray-50 ${student.is_absent ? 'opacity-50' : ''}`}>
                    <td className="py-3 font-medium text-gray-800">{student.student_roll}</td>
                    <td className="py-3">
                      {student.is_absent ? (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">Absent</span>
                      ) : student.answer_sheet_path ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full flex items-center gap-1 w-fit">
                          <CheckCircle size={12} /> Uploaded
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full">Pending</span>
                      )}
                    </td>
                    <td className="py-3">
                      {!student.is_absent && (
                        <div className="flex gap-2">
                          <label className="cursor-pointer text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100">
                            {uploading[student.student_roll] ? 'Uploading...' : 'Upload Sheet'}
                            <input
                              type="file"
                              className="hidden"
                              accept=".jpg,.jpeg,.png,.pdf"
                              onChange={e => uploadAnswer(student.student_roll, e.target.files[0])}
                              disabled={uploading[student.student_roll]}
                            />
                          </label>
                          <button
                            onClick={() => markAbsent(student.student_roll)}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-medium hover:bg-red-100 flex items-center gap-1"
                          >
                            <UserX size={12} /> Absent
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}