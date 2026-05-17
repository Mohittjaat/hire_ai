import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  FileText, 
  Clock, 
  Layers, 
  MessageSquare, 
  Sparkles, 
  X, 
  Target,
  ChevronDown
} from 'lucide-react';

const InterviewSetup: React.FC = () => {
  // State to store jobs created by HR
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    jobId: '', 
    experience: '',
    questionCount: '5',
    type: 'Technical Screening', // Default matched to dropdown options
    depth: 'Intermediate / Practical', 
    specialInstructions: '', 
    jobDescription: ''
  });

  // Load jobs from localStorage on mount
  useEffect(() => {
    const allJobs = JSON.parse(localStorage.getItem("allJobs") || "[]");
    setAvailableJobs(allJobs);
  }, []);

  const handleInitialize = () => {
    console.log("Initializing AI with Rules:", formData);
    
    // 1. Keep your specific Job ID mapping data matrix intact
    const allJobs = JSON.parse(localStorage.getItem("allJobs") || "[]");
    const updatedJobs = allJobs.map((j: any) => 
      j.id === Number(formData.jobId) 
      ? { ...j, interviewConfig: formData } 
      : j
    );
    localStorage.setItem("allJobs", JSON.stringify(updatedJobs));
    
    // 2. Synchronize active state variables straight into your core voice pipeline
    localStorage.setItem("active_interview_rules", JSON.stringify(formData));
    
    alert("AI Interview Rules Saved! Candidates will now be required to upload resumes in the Interview Room.");
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-6 font-sans">
      {/* Main Modal Container */}
      <div className="bg-[#111622] w-full max-w-4xl border border-gray-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Sparkles className="text-indigo-500" /> Configure Interview Rules
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Define question criteria. Candidates will provide their resumes when they enter the room.
            </p>
          </div>
          <button className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Left Column: Role & Config */}
          <div className="space-y-8">
            {/* Targeted Role */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <Target size={14} /> Targeted Job Role
              </label>
              <div className="relative">
                <select 
                  className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-white appearance-none"
                  value={formData.jobId}
                  onChange={(e) => setFormData({...formData, jobId: e.target.value})}
                >
                  <option value="" className="bg-[#111622]">Select an active job type...</option>
                  {availableJobs.map(job => (
                    <option key={job.id} value={job.id} className="bg-[#111622]">
                      {job.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={18} />
              </div>
            </div>

            {/* Experience and Question Count Row */}
            <div className="flex gap-6">
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <Clock size={14} /> Min. Experience
                </label>
                <input 
                  type="number" 
                  placeholder="Years"
                  className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-white"
                  value={formData.experience}
                  onChange={(e) => setFormData({...formData, experience: e.target.value})}
                />
              </div>
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <Layers size={14} /> Question Count
                </label>
                <input 
                  type="number" 
                  className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-white"
                  value={formData.questionCount}
                  onChange={(e) => setFormData({...formData, questionCount: e.target.value})}
                />
              </div>
            </div>

            {/* Interview Type */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <MessageSquare size={14} /> Interview Category
              </label>
              <select 
                className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-sm text-white"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option className="bg-[#111622]">Technical Screening</option>
                <option className="bg-[#111622]">Behavioral / HR</option>
                <option className="bg-[#111622]">System Design</option>
                <option className="bg-[#111622]">Full Cycle Mixed</option>
              </select>
            </div>
          </div>

          {/* Right Column: Text Areas */}
          <div className="space-y-8">
            {/* Interview Depth */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <FileText size={14} /> Question Depth & Complexity
              </label>
              <select 
                className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none text-sm text-white"
                value={formData.depth}
                onChange={(e) => setFormData({...formData, depth: e.target.value})}
              >
                <option className="bg-[#111622]">Conceptual / Junior Level</option>
                <option className="bg-[#111622]">Intermediate / Practical</option>
                <option className="bg-[#111622]">Advanced / Architectural</option>
                <option className="bg-[#111622]">Managerial / Leadership</option>
              </select>
            </div>

            {/* Special Instructions */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <Sparkles size={14} /> Custom Focus Areas (Optional)
              </label>
              <textarea 
                placeholder="e.g. Focus heavily on React Hooks, Node.js Middleware, and communication skills..."
                className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl h-32 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none shadow-inner text-white"
                value={formData.specialInstructions}
                onChange={(e) => setFormData({...formData, specialInstructions: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end items-center gap-6 mt-12 pt-8 border-t border-gray-800">
          <button className="text-gray-400 hover:text-white font-bold text-sm transition-colors uppercase tracking-widest">
            Cancel
          </button>
          <button 
            onClick={handleInitialize}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            Save Rules & Initialize AI <Sparkles size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;