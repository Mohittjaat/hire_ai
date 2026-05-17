import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Upload, 
  Settings, 
  LogOut, 
  Sparkles, 
  TrendingUp, 
  Briefcase 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. DYNAMIC NAME STATE: Holds the HR name from registration
  const [userName, setUserName] = useState('Sarah Johnson');

  // 2. FETCH USER DATA: Runs once when sidebar loads
  useEffect(() => {
    const storedUser = localStorage.getItem('hr_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUserName(userData.fullName || 'Sarah Johnson');
    }
  }, []);

  // Navigation items merged with Job Postings
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Candidate Screening', icon: <Users size={20} />, path: '/candidates' },
    { name: 'Job Postings', icon: <Briefcase size={20} />, path: '/jobs' }, 
    { name: 'Setup Interview', icon: <Sparkles size={20} />, path: '/setup-interview' }, 
    { name: 'AI Interview Reports', icon: <MessageSquare size={20} />, path: '/ai-reports' },
    { name: 'Bulk Upload', icon: <Upload size={20} />, path: '/upload' },
    { name: 'Analytics', icon: <TrendingUp size={20} />, path: '/analytics' }, 
    // Settings preserved in the code but will be filtered out for the UI
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  // Helper: Generates initials (e.g., "Sarah Johnson" -> "SJ")
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <div className="w-64 h-screen bg-[#111622] text-slate-400 flex flex-col fixed left-0 top-0 border-r border-slate-800 z-50">
      
      {/* LOGO SECTION */}
      <div className="p-6 mb-4">
        <div className="flex items-center gap-2 text-white">
          <div className="bg-indigo-600 p-1.5 rounded-lg font-bold">AI</div>
          <div>
            <h1 className="text-lg font-bold leading-none">HireAI</h1>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Intelligence</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {menuItems
          // --- INVISIBLE SETTINGS FIX ---
          // This filter hides 'Settings' from the UI while keeping it in the array for future use
          .filter(item => item.name !== 'Settings')
          .map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                    : 'hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
        })}
      </nav>

      {/* BOTTOM SECTION: DYNAMIC PROFILE & LOGOUT */}
      <div className="mt-auto border-t border-slate-800 bg-[#0a0c14]/50">
        <div className="p-4">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {getInitials(userName)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Recruiter Account</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-6">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all group"
          >
            <div className="p-2 bg-slate-800 group-hover:bg-red-500/20 rounded-lg transition-colors">
              <LogOut size={18} />
            </div>
            <span className="font-bold text-sm">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;