import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { BookOpen } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function Login() {
  const [role, setRole] = useState('faculty');
  const [form, setForm] = useState({
    email: 'faculty@college.com',
    password: 'faculty123',
    semester: '',
    branch: '',
    section: '',
    roll_number: ''
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (role === 'faculty') {
        res = await axios.post(`${API}/auth/faculty/login`, {
          email: form.email,
          password: form.password
        });
      } else {
        res = await axios.post(`${API}/auth/student/login`, {
          semester: form.semester,
          branch: form.branch,
          section: form.section,
          roll_number: form.roll_number
        });
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Login successful!');
      navigate(role === 'faculty' ? '/faculty/dashboard' : '/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
            <BookOpen size={28} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Smart Exam Evaluator</h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered exam evaluation system</p>
        </div>

        <div className="card">
          {/* Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${role === 'faculty' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
              onClick={() => setRole('faculty')}
            >
              Faculty
            </button>
            <button
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${role === 'student' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
              onClick={() => setRole('student')}
            >
              Student
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'faculty' ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                  <input
                    type="email"
                    className="input-field"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="faculty@college.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Semester</label>
                    <select className="select-field" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                      <option value="">Select</option>
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Branch</label>
                    <select className="select-field" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})}>
                      <option value="">Select</option>
                      {['CSE','ECE','EEE','MECH','CIVIL'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Section</label>
                    <select className="select-field" value={form.section} onChange={e => setForm({...form, section: e.target.value})}>
                      <option value="">Select</option>
                      {['A','B','C','D'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Roll Number</label>
                    <input
                      className="input-field"
                      value={form.roll_number}
                      onChange={e => setForm({...form, roll_number: e.target.value})}
                      placeholder="21A91A0501"
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary w-full mt-2">
              Sign In
            </button>
          </form>

          {role === 'faculty' && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Demo: faculty@college.com / faculty123
            </p>
          )}
        </div>
      </div>
    </div>
  );
}