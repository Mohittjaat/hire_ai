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
  ChevronDown,
  Wand2,
  Trash2,
  Plus,
  BookOpen,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { hrStorage } from '../services/hrStorage';
// ✅ ADDED: MongoDB API imports
import { getJobs, saveInterviewRules } from '../services/api';

const InterviewSetup: React.FC = () => {
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    jobId: '', 
    experience: '',
    questionCount: '5',
    type: 'Technical Screening',
    depth: 'Intermediate / Practical', 
    specialInstructions: '', 
    jobDescription: ''
  });

  // ─── Question Bank State ─────────────────────────────────────────────────────
  const [questionBank, setQuestionBank] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        // ✅ MODIFIED: Try MongoDB first
        const result = await getJobs();
        if (result.success && result.jobs?.length > 0) {
          setAvailableJobs(result.jobs);
          // Sync to localStorage as cache
          hrStorage.setItem("allJobs", JSON.stringify(result.jobs));
          return;
        }
      } catch (err) {
        console.warn("MongoDB fetch failed, falling back to localStorage");
      }
      // ✅ FALLBACK: Load from localStorage
      const allJobs = JSON.parse(hrStorage.getItem("allJobs") || "[]");
      setAvailableJobs(allJobs);
    };

    loadJobs();
  }, []);

  // ─── Generate Question Bank via Gemini ──────────────────────────────────────
  const generateQuestionBank = async () => {
    setIsGeneratingQuestions(true);
    setShowQuestionBank(true);

    try {
      const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!GEMINI_KEY) {
        alert("Gemini API key not found. Please check your .env file.");
        setIsGeneratingQuestions(false);
        return;
      }

      const selectedJob = availableJobs.find(j => 
        j._id?.toString() === formData.jobId || j.id?.toString() === formData.jobId
      );
      const jobTitle = selectedJob?.title || "Software Developer";

      const prompt = `You are an expert technical interviewer. Generate exactly 10 interview questions for the following role and configuration.

Role: ${jobTitle}
Interview Type: ${formData.type}
Depth/Level: ${formData.depth}
Focus Areas: ${formData.specialInstructions || "General technical skills"}
Min Experience: ${formData.experience || "Not specified"} years

RULES:
- Questions should be specific, practical and relevant to the role
- Mix of conceptual and hands-on questions
- Match the depth level exactly
- Focus heavily on the specified focus areas if provided
- Questions should be open-ended to allow detailed answers

Respond ONLY with a valid JSON array of strings, no markdown, no numbering:
["question 1", "question 2", "question 3", "question 4", "question 5", "question 6", "question 7", "question 8", "question 9", "question 10"]`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = rawText.replace(/```json|```/g, "").trim();
      const questions = JSON.parse(clean);
      setQuestionBank(questions);
    } catch (err) {
      console.error("Question bank generation failed:", err);
      // Fallback questions if Gemini fails
      setQuestionBank([
        `Walk me through your experience with ${formData.specialInstructions?.split(',')[0]?.trim() || "your main tech stack"}.`,
        "Describe a challenging technical problem you solved recently. What was your approach?",
        "How do you ensure code quality and maintainability in your projects?",
        "Tell me about a time you had to learn a new technology quickly. How did you approach it?",
        "How do you handle disagreements with your team about technical decisions?",
        "What's your approach to debugging a complex issue in production?",
        "Describe your experience working in agile/scrum environments.",
        "How do you prioritize tasks when working on multiple projects simultaneously?",
        "What's the most impactful project you've worked on? What was your contribution?",
        "Where do you see yourself technically in the next 2 years?"
      ]);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const deleteQuestion = (index: number) => {
    setQuestionBank(prev => prev.filter((_, i) => i !== index));
  };

  const addCustomQuestion = () => {
    if (!newCustomQuestion.trim()) return;
    setQuestionBank(prev => [...prev, newCustomQuestion.trim()]);
    setNewCustomQuestion('');
  };

  const handleInitialize = async () => {
    console.log("Initializing AI with Rules:", formData);
    
    // ✅ Keep existing localStorage sync for job config
    const allJobs = JSON.parse(hrStorage.getItem("allJobs") || "[]");
    const updatedJobs = allJobs.map((j: any) => 
      j.id === Number(formData.jobId) || j._id?.toString() === formData.jobId
      ? { ...j, interviewConfig: formData } 
      : j
    );
    hrStorage.setItem("allJobs", JSON.stringify(updatedJobs));
    
    // ✅ Save rules + question bank together
    const rulesToSave = {
      ...formData,
      questionBank: questionBank.length > 0 ? questionBank : []
    };

    // ✅ Always save to localStorage for InterviewRoom compatibility
    localStorage.setItem("active_interview_rules", JSON.stringify(rulesToSave));

    // ✅ ADDED: Also save to MongoDB
    try {
      await saveInterviewRules(rulesToSave);
    } catch (err) {
      console.warn("MongoDB rules save failed, localStorage saved successfully");
    }
    
    alert(`AI Interview Rules Saved! ${questionBank.length > 0 ? `${questionBank.length} reference questions saved for Burt.` : 'Candidates will now be required to upload resumes in the Interview Room.'}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-6 font-sans">
      <div className="bg-[#111622] w-full max-w-5xl border border-gray-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        
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
                  {availableJobs.map(job => {
                    const jobId = job._id?.toString() || job.id?.toString();
                    return (
                      <option key={jobId} value={jobId} className="bg-[#111622]">
                        {job.title}
                      </option>
                    );
                  })}
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

        {/* ─── QUESTION BANK SECTION ─────────────────────────────────────────── */}
        <div className="mt-10 border-t border-gray-800 pt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-white font-black text-lg flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-400" /> AI Question Bank
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                Generate reference questions — Burt will use these as guidelines and adapt them based on each candidate's resume
              </p>
            </div>
            <button
              onClick={generateQuestionBank}
              disabled={isGeneratingQuestions}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
            >
              {isGeneratingQuestions ? (
                <><Loader2 size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Wand2 size={16} /> Generate Questions</>
              )}
            </button>
          </div>

          {/* Question Bank List */}
          {showQuestionBank && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {isGeneratingQuestions ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 size={40} className="text-indigo-500 animate-spin" />
                  <p className="text-gray-400 text-sm">Gemini is crafting questions for this role...</p>
                </div>
              ) : (
                <>
                  {/* Questions List */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {questionBank.map((q, index) => (
                      <div key={index} className="flex items-start gap-3 bg-[#0d1117] border border-gray-700 rounded-2xl p-4 group hover:border-indigo-500/50 transition-all">
                        <span className="text-indigo-400 font-black text-xs mt-0.5 shrink-0 w-5">Q{index + 1}</span>
                        <p className="text-gray-300 text-sm flex-1 leading-relaxed">{q}</p>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Question */}
                  <div className="flex gap-3 mt-4">
                    <input
                      type="text"
                      placeholder="Add your own custom question..."
                      value={newCustomQuestion}
                      onChange={(e) => setNewCustomQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomQuestion()}
                      className="flex-1 bg-[#0d1117] border border-gray-700 p-3 rounded-2xl text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      onClick={addCustomQuestion}
                      disabled={!newCustomQuestion.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-emerald-400 text-xs font-bold">
                      {questionBank.length} questions ready — Burt will adapt these based on each candidate's resume
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {!showQuestionBank && (
            <div className="border-2 border-dashed border-gray-800 rounded-2xl p-8 text-center">
              <BookOpen size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-600 text-sm">Click "Generate Questions" to create a personalized question bank for this role</p>
            </div>
          )}
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