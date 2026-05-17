import React, { useEffect, useState } from 'react';
import { Briefcase, ChevronRight, RefreshCw, Search, Filter, Trash2, Mail } from 'lucide-react';
// 1. Import your Modal component here
import EvaluationModal from '../components/EvaluationModal'; 

export default function InterviewDashboard() {
  const [interviews, setInterviews] = useState([
    {
      id: "1",
      candidateName: "Sarah Mock",
      candidateEmail: "sarah.mock@example.com",
      jobRole: "Software Developer",
      type: "Mixed",
      feedback: { totalScore: 85, decision: "SELECTED" },
      date: "2/19/2026"
    },
    {
      id: "2",
      candidateName: "Alex Rivera",
      candidateEmail: "arivera@tech.co",
      jobRole: "Full Stack Developer",
      type: "Technical",
      feedback: { totalScore: 12, decision: "REJECTED" },
      date: "2/18/2026"
    }
  ]);

  // 2. Added state to track which candidate report to show
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const fetchData = () => {
    fetch("http://localhost:5000/api/admin/interviews")
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setInterviews(data);
      })
      .catch(err => console.log("Backend offline, using styled mock data."));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-4 md:p-10 bg-[#0a0c14] min-h-screen text-white font-sans">
      {/* Top Navigation Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AI Interview Reports</h1>
          <div className="flex items-center gap-3 mt-2">
             <span className="text-slate-500 text-sm">{interviews.length} sessions total</span>
             <div className="h-1 w-1 bg-slate-700 rounded-full"></div>
             <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">HR Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search candidates..." 
              className="bg-[#111622] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 w-full md:w-64 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <button onClick={fetchData} className="p-2.5 bg-[#111622] rounded-xl border border-slate-800 hover:bg-slate-800 transition-all text-indigo-400">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Grid matching the "Your Sessions" screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {interviews.map((interview) => (
          <div key={interview.id} className="bg-[#111622] p-7 rounded-[2rem] border border-slate-800/50 hover:border-indigo-500/40 transition-all group relative overflow-hidden">
            
            {/* Background Glow Effect */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-600/5 blur-[50px] group-hover:bg-indigo-600/10 transition-all"></div>

            <div className="flex justify-between items-start mb-8">
              <div className="flex gap-4">
                <button className="p-2 bg-slate-800/50 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 size={16}/>
                </button>
              </div>
              
              <span className={`text-[9px] font-bold px-3 py-1 rounded-md uppercase tracking-tighter border ${
                interview.type === 'Technical' 
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                {interview.type || 'Mixed'}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
               <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/20">
                  <Briefcase size={28} className="text-white"/>
               </div>
               <div>
                  <h3 className="text-xl font-bold group-hover:text-indigo-400 transition-colors capitalize">
                    {interview.candidateName}
                  </h3>
                  <p className="text-slate-500 text-xs flex items-center gap-1">
                    <Mail size={12}/> {interview.candidateEmail}
                  </p>
               </div>
            </div>

            <div className="space-y-1 mb-8">
              <p className="text-lg font-semibold text-slate-200">{interview.jobRole}</p>
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <span>{interview.date}</span>
                <span>•</span>
                <span className={interview.feedback?.decision === 'SELECTED' ? 'text-emerald-500' : 'text-red-500'}>
                  {interview.feedback?.decision}
                </span>
              </div>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed mb-8">
              Session complete. You can now review the candidate's technical strengths and detailed AI score.
            </p>

            <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                    AI
                  </div>
                  <span className="text-xs font-bold">Score: {interview.feedback?.totalScore}/100</span>
               </div>
               
               {/* 3. Added the onClick to trigger the modal */}
               <button 
                onClick={() => setSelectedCandidate(interview)}
                className="flex items-center gap-2 text-xs font-bold bg-slate-800/50 hover:bg-indigo-600 px-5 py-2.5 rounded-xl transition-all"
               >
                 View Result <ChevronRight size={14}/>
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Added the Modal component at the bottom */}
      <EvaluationModal 
        isOpen={!!selectedCandidate} 
        onClose={() => setSelectedCandidate(null)} 
        candidateData={selectedCandidate} 
      />
    </div>
  );
}