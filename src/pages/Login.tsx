import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, UserCircle } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // --- STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // New State for Candidate Access
  const [isCandidateMode, setIsCandidateMode] = useState(false);

  // --- NEW: AUTO-CAPTURE EMAIL FROM INTERVIEW INVITE LINK ---
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      const cleanEmail = decodeURIComponent(emailParam).trim();
      setEmail(cleanEmail);
      setIsCandidateMode(true); // Automatically toggle to candidate screen if clicking from email invitation link
    }
  }, [searchParams]);

  // --- HR LOGIN LOGIC ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const storedUser = localStorage.getItem('hr_user');
    
    if (storedUser) {
      const userData = JSON.parse(storedUser);

      if (email.trim().toLowerCase() === userData.email.toLowerCase() && password === userData.password) {
        localStorage.setItem('isAuthenticated', 'true'); 
        localStorage.setItem('userRole', 'HR');
        navigate('/dashboard'); 
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } else {
      setError('No account found. Please sign up first.');
    }
  };

  // --- MERGED: CANDIDATE ACCESS LOGIC ---
  const handleCandidateAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Get all jobs/candidates from storage
    const allJobs = JSON.parse(localStorage.getItem("allJobs") || "[]");
    
    // 2. Search for the candidate across all job pipelines
    let foundCandidate: any = null;
    allJobs.forEach((job: any) => {
      const match = job.candidates?.find((c: any) => 
        c.email && c.email.trim().toLowerCase() === email.trim().toLowerCase() && c.status === "Shortlisted"
      );
      if (match) foundCandidate = { ...match, jobTitle: job.title };
    });

    if (foundCandidate) {
      // 3. Set Session for Candidate
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userRole', 'CANDIDATE');
      localStorage.setItem('activeCandidate', JSON.stringify(foundCandidate));
      
      navigate('/interview'); 
    } else {
      setError('Access Denied. Only shortlisted candidates can enter. Ensure your email is correct.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-6 font-sans text-white">
      <div className="w-full max-w-4xl bg-[#111622] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-800">
        
        {/* Left Side: Branding */}
        <div className="md:w-2/5 bg-gradient-to-br from-indigo-600 to-violet-700 p-12 text-white flex flex-col justify-center items-center text-center relative">
          <h2 className="text-3xl font-black mb-4 relative z-10 uppercase tracking-tight">
            {isCandidateMode ? "Ready for your Interview?" : "Jumpstart Your Hiring!"}
          </h2>
          <p className="text-indigo-100 mb-8 text-sm relative z-10">
            {isCandidateMode 
              ? "Shortlisted candidates can access the AI-powered interview room using their registered email."
              : "Enter your personal details to manage your candidate assessments and site features."}
          </p>
          {!isCandidateMode && (
            <Link 
              to="/register"
              className="border-2 border-white/50 px-8 py-3 rounded-xl font-bold hover:bg-white hover:text-indigo-600 transition-all relative z-10"
            >
              SIGN UP
            </Link>
          )}
          {isCandidateMode && (
             <button 
              onClick={() => {setIsCandidateMode(false); setError('');}}
              className="border-2 border-white/50 px-8 py-3 rounded-xl font-bold hover:bg-white hover:text-indigo-600 transition-all relative z-10"
            >
              BACK TO HR LOGIN
            </button>
          )}
        </div>

        {/* Right Side: Form */}
        <div className="md:w-3/5 p-12 bg-[#111622]">
          <div className="max-w-sm mx-auto">
            <h1 className="text-3xl font-bold mb-2">
              {isCandidateMode ? "Candidate Portal" : "Welcome Back!"}
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              {isCandidateMode ? "Enter your email to verify your shortlist status." : "Log in with your HR credentials."}
            </p>

            {/* Error Message Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs font-bold animate-pulse">
                {error}
              </div>
            )}

            <form onSubmit={isCandidateMode ? handleCandidateAccess : handleLogin} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  placeholder="Registered Email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              {!isCandidateMode && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 py-4 rounded-xl font-bold shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 text-white"
              >
                {isCandidateMode ? "ENTER INTERVIEW ROOM" : "LOG IN"} <ArrowRight size={18}/>
              </button>
            </form>

            {!isCandidateMode && (
              <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                <p className="text-slate-500 text-[10px] mb-4 uppercase tracking-widest font-black">Are you a candidate?</p>
                <button 
                  type="button"
                  onClick={() => {setIsCandidateMode(true); setError('');}}
                  className="flex items-center gap-2 mx-auto text-indigo-400 hover:text-indigo-300 font-bold text-sm transition-colors"
                >
                  <ShieldCheck size={18}/> Access Interview Room
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}