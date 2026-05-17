import React, { useState } from 'react';
import { Mail, Lock, User, Briefcase, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();

  // 1. ADDED STATE: To capture form inputs
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    email: '',
    password: ''
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    // 2. MODIFIED: Save the actual user data to "database" (localStorage)
    // This allows the Login page to check against these specific credentials
    localStorage.setItem('hr_user', JSON.stringify(formData));
    
    // 3. Set Auth flags
    localStorage.setItem('isAuthenticated', 'true'); 
    localStorage.setItem('userRole', 'HR');
    
    // 4. Redirect
    navigate('/dashboard');
  };

  // Helper to update state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-6 font-sans text-white">
      <div className="w-full max-w-4xl bg-[#111622] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row-reverse border border-slate-800">
        
        {/* Side Panel */}
        <div className="md:w-2/5 bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-white flex flex-col justify-center items-center text-center relative">
          <h2 className="text-3xl font-black mb-4 relative z-10 uppercase tracking-tight">
            Hello, HR!
          </h2>
          <p className="text-indigo-100 mb-8 text-sm relative z-10">
            Enter your professional details and start your AI hiring journey with us.
          </p>
          <Link 
            to="/login"
            className="border-2 border-white/50 px-8 py-3 rounded-xl font-bold hover:bg-white hover:text-indigo-600 transition-all relative z-10"
          >
            LOG IN
          </Link>
        </div>

        {/* Form Panel */}
        <div className="md:w-3/5 p-12 bg-[#111622]">
          <div className="max-w-sm mx-auto">
            <h1 className="text-3xl font-bold mb-2">Create HR Account</h1>
            <p className="text-slate-500 text-sm mb-8">Register your organization to begin.</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  name="fullName"
                  placeholder="Full Name" 
                  required
                  onChange={handleChange}
                  className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  name="company"
                  placeholder="Company Name" 
                  required
                  onChange={handleChange}
                  className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  name="email"
                  placeholder="Work Email" 
                  required
                  onChange={handleChange}
                  className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  name="password"
                  placeholder="Password (min 8 characters)" 
                  required
                  onChange={handleChange}
                  className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-bold shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 mt-4 text-white"
              >
                SIGN UP <ArrowRight size={18}/>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}