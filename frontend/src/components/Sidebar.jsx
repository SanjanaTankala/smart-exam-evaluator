import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, BookOpen, FileText } from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const links = [
    { to: '/faculty/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/faculty/create-exam', icon: <PlusCircle size={20} />, label: 'Create Exam' },
    { to: '/faculty/question-paper', icon: <FileText size={20} />, label: 'Question Paper' },
  ];

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BookOpen size={18} color="white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-sm">Smart Exam</h1>
            <p className="text-xs text-gray-500">Evaluator</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
              ${location.pathname === link.to
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}