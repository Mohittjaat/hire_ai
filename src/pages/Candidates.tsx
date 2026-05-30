import { useState, useEffect, useMemo } from "react"; 
import { useLocation, useNavigate } from "react-router-dom"; 
import { Upload, Download, Search, Filter, MoreHorizontal, User, CheckCircle2, XCircle, Zap, Mail, PhoneCall, Scale, ShieldCheck, Info, Swords, Loader2 } from 'lucide-react';
import Vapi from "@vapi-ai/web"; 
// Import the multi-tenant storage controller helper service
import { hrStorage } from '../services/hrStorage';
// ✅ ADDED: MongoDB API imports
import { getJobs, updateJob } from '../services/api';

const vapi = new Vapi("398eb9ba-4a89-47e9-83b1-27ba54773733"); 

export default function Candidates() {
  const location = useLocation(); 
  const navigate = useNavigate(); 

  // --- EXISTING STATE ---
  const [activeJobId, setActiveJobId] = useState<any>(null);
  const [activeMongoId, setActiveMongoId] = useState<string | null>(null); // ✅ ADDED: track MongoDB _id
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCalling, setIsCalling] = useState(false); 
  const [progress, setProgress] = useState(0); 
  const [currentFile, setCurrentFile] = useState("");
  const [uploadMode, setUploadMode] = useState<"manual" | "bulk">("manual");
  const [compareMode, setCompareMode] = useState(false);
  const [minScore, setMinScore] = useState<number>(50);
  const [shortlistLimit, setShortlistLimit] = useState<number>(100);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[] | null>(null); 
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- NEW: BATTLE MODE STATE ---
  const [battleMode, setBattleMode] = useState(false);
  const [battleIds, setBattleIds] = useState<number[]>([]);
  const [battleData, setBattleData] = useState<any>(null);
  const [isComparingBattle, setIsComparingBattle] = useState(false);

  // --- SYNC LOGIC & AUTO-FILL ---
  useEffect(() => {
    const loadJobData = async () => {
      let allJobs: any[] = [];

      try {
        // ✅ MODIFIED: Try MongoDB first
        const result = await getJobs();
        if (result.success && result.jobs?.length > 0) {
          allJobs = result.jobs;
          // Sync to localStorage cache
          hrStorage.setItem("allJobs", JSON.stringify(allJobs));
        } else {
          // ✅ FALLBACK: Load namespaced data using the hrStorage service layer
          allJobs = JSON.parse(hrStorage.getItem("allJobs") || "[]");
        }
      } catch (err) {
        // ✅ FALLBACK: Load namespaced data using the hrStorage service layer
        allJobs = JSON.parse(hrStorage.getItem("allJobs") || "[]");
      }

      const targetId = location.state?.jobId || location.state?.targetJobId || activeJobId;
      const sessionJobTitle = localStorage.getItem('active_job_filter');
      
      if (targetId || sessionJobTitle) {
        const currentJob = allJobs.find((j: any) => 
          j._id?.toString() === targetId?.toString() ||
          j.id?.toString() === targetId?.toString() || 
          j.title === sessionJobTitle
        );
        
        if (currentJob) {
          setActiveJobId(currentJob.id || currentJob._id);
          setActiveMongoId(currentJob._id?.toString() || null); // ✅ ADDED
          setJobTitle(currentJob.title || "");
          setJobDescription(currentJob.description || "");
          const sorted = (currentJob.candidates || []).sort((a: any, b: any) => (b.fairScore || b.score) - (a.fairScore || a.score));
          setCandidates(sorted);
        }
      }

      if (location.state?.uploadedFiles) {
        setBulkFiles(location.state.uploadedFiles);
        setUploadMode("bulk");
        if (location.state.autoStart && !isAnalyzing) {
          setTimeout(() => handleRunAnalysis(), 500);
        }
      }
    };

    loadJobData();
  }, [location.state]);

  // --- SOURCE OF TRUTH SYNC ---
  const syncToGlobalStorage = async (updatedTitle: string, updatedDesc: string, updatedCandidates: any[]) => {
    // ✅ MODIFIED: Synchronize mutations within this specific HR account sandbox context
    const allJobs = JSON.parse(hrStorage.getItem("allJobs") || "[]");
    const updatedJobs = allJobs.map((j: any) => {
      if (j._id?.toString() === activeMongoId || j.id === activeJobId || j.title === updatedTitle) {
        return { 
          ...j, 
          title: updatedTitle, 
          description: updatedDesc, 
          candidates: updatedCandidates,
          applicants: updatedCandidates.length,
          screened: updatedCandidates.filter((c: any) => (c.score || 0) > 0).length
        };
      }
      return j;
    });
    hrStorage.setItem("allJobs", JSON.stringify(updatedJobs));

    // ✅ ADDED: Also sync to MongoDB if we have a MongoDB ID
    if (activeMongoId) {
      try {
        await updateJob(activeMongoId, {
          title: updatedTitle,
          description: updatedDesc,
          candidates: updatedCandidates,
          applicants: updatedCandidates.length,
          screened: updatedCandidates.filter((c: any) => (c.score || 0) > 0).length
        });
      } catch (err) {
        console.warn("MongoDB sync failed, localStorage updated only");
      }
    }
  };

  // --- BATTLE COMPARISON HANDLER ---
  const runBattleComparison = async (idA: number, idB: number) => {
    setIsComparingBattle(true);
    try {
      const candidateA = candidates.find(c => c.id === idA);
      const candidateB = candidates.find(c => c.id === idB);

     const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/battle-compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateA,
          candidateB,
          jobDescription: jobDescription || "General Role"
        })
      });

      if (!response.ok) throw new Error("Server Error");
      const data = await response.json();

      // Replace {{NAME_A}} and {{NAME_B}} tokens with real candidate names
      const nameA = candidateA?.name || "Candidate A";
      const nameB = candidateB?.name || "Candidate B";

      const replaceTokens = (text: string) =>
        text?.replace(/\{\{NAME_A\}\}/g, nameA).replace(/\{\{NAME_B\}\}/g, nameB) || text;

      const cleanedData = {
        ...data,
        candidateA: {
          ...data.candidateA,
          edge: replaceTokens(data.candidateA?.edge),
          pros: data.candidateA?.pros?.map(replaceTokens),
          cons: data.candidateA?.cons?.map(replaceTokens),
        },
        candidateB: {
          ...data.candidateB,
          edge: replaceTokens(data.candidateB?.edge),
          pros: data.candidateB?.pros?.map(replaceTokens),
          cons: data.candidateB?.cons?.map(replaceTokens),
        },
        verdict: replaceTokens(data.verdict),
      };

      setBattleData(cleanedData);
    } catch (error) {
      console.error("🔥 Battle error:", error);
    } finally {
      setIsComparingBattle(false);
    }
  };

  const toggleBattleSelect = (id: number) => {
    setBattleIds(prev => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter(i => i !== id);
      } else {
        next = prev.length >= 2 ? [prev[1], id] : [...prev, id];
      }
      
      if (next.length === 2) {
        runBattleComparison(next[0], next[1]);
      } else {
        setBattleData(null);
      }
      return next;
    });
  };

  const handleConductInterview = (candidate: any) => {
    navigate("/setup-interview", {
      state: {
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        role: jobTitle,
        resumeText: candidate.explanation || ""
      }
    });
  };

  const sendInviteEmail = async (candidate: any) => {
    try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateEmail: candidate.email.trim(),
          candidateName: candidate.name,
          jobTitle: jobTitle
        }),
      });
      const data = await response.json();
      if (data.success) console.log(`✅ Invite delivered to ${candidate.email}`);
    } catch (error) {
      console.error("🔥 Network error sending email:", error);
    }
  };

  const applySmartDecisions = () => {
    const sortedList = [...candidates].sort((a, b) => (b.fairScore || b.score) - (a.fairScore || a.score));
    let count = 0;
    const updated = sortedList.map((c) => {
      const currentScore = c.fairScore || c.score;
      if (currentScore >= minScore && count < shortlistLimit) {
        count++;
        if (c.status !== "Shortlisted") sendInviteEmail(c);
        return { ...c, status: "Shortlisted", invited: true };
      }
      return { ...c, status: "Rejected", invited: false };
    });
    setCandidates(updated);
    syncToGlobalStorage(jobTitle, jobDescription, updated);
    alert(`Applied! ${count} Shortlisted.`);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>, id: number) => {
    const newStatus = e.target.value;
    const updated = candidates.map(c => {
      if (c.id === id) {
        if (newStatus === "Shortlisted" && c.status !== "Shortlisted") sendInviteEmail(c);
        return { ...c, status: newStatus, invited: newStatus === "Shortlisted" };
      }
      return c;
    });
    setCandidates(updated);
    syncToGlobalStorage(jobTitle, jobDescription, updated);
  };

  const handleBulkStatusUpdate = (status: string) => {
    const updated = candidates.map(c => {
      if (selectedIds.includes(c.id)) {
        if (status === "Shortlisted" && c.status !== "Shortlisted") sendInviteEmail(c);
        return { ...c, status, invited: status === "Shortlisted" };
      }
      return c;
    });
    setCandidates(updated);
    syncToGlobalStorage(jobTitle, jobDescription, updated);
    setSelectedIds([]);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleRunAnalysis = async () => {
    if (!jobTitle || !jobDescription) return alert("Please provide job details first!");
    setIsAnalyzing(true);
    setProgress(0);
    try {
      const filesToProcess = uploadMode === "manual" ? [resume] : Array.from(bulkFiles || []);
      if (!filesToProcess[0]) return alert("Please select files");

      const processedResults: any[] = [];
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i] as File;
        setCurrentFile(file.name);
        const formData = new FormData();
        formData.append("resume", file);
        formData.append("jobTitle", jobTitle);
        formData.append("jobDescription", jobDescription);
        if (uploadMode === "manual") {
          formData.append("manualName", name);
          formData.append("manualEmail", email.trim());
        }

        const response = await fetch("http://localhost:5000/embed-analyze", {
          method: "POST", 
          body: formData 
        });

        if (!response.ok) throw new Error("Server error");
        const data = await response.json();
        
        const newCandidate = { 
          ...data,
          id: Date.now() + Math.random(), 
          name: data.name && !data.name.includes("Extract") ? data.name : (uploadMode === "manual" ? name : file.name),
          email: data.email && !data.email.includes("Extract") ? data.email.trim() : (uploadMode === "manual" ? email.trim() : "N/A"),
          score: data.fairScore || data.score || 0,
          status: "Screening",
          invited: false 
        };
        processedResults.push(newCandidate);
        setProgress(Math.round(((i + 1) / filesToProcess.length) * 100));
      }
      
      const updated = [...processedResults, ...candidates].sort((a, b) => (b.fairScore || b.score) - (a.fairScore || a.score));
      setCandidates(updated);
      syncToGlobalStorage(jobTitle, jobDescription, updated);

      if (uploadMode === "manual") {
        setName(""); setEmail(""); setResume(null);
      }
    } catch (e) { 
      console.error(e);
      alert("Analysis failed."); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const battleCandidates = candidates.filter(c => battleIds.includes(c.id));

  return (
    <div className="flex gap-0 min-h-screen relative overflow-x-hidden">
      <div className={`flex-1 space-y-6 p-8 transition-all duration-500 animate-in fade-in ${selectedCandidate ? 'pr-[420px]' : ''}`}>
        
        {/* HEADER & TOGGLES */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 text-left">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Pipeline Auditor</h1>
            <p className="text-sm text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                {jobTitle ? `Role: ${jobTitle}` : 'Global Candidate Audit'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
             <button onClick={() => {setCompareMode(false); setBattleMode(false);}} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!compareMode && !battleMode ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>Standard</button>
             <button onClick={() => {setCompareMode(true); setBattleMode(false);}} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${compareMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Bias Check</button>
             <button onClick={() => {setBattleMode(true); setCompareMode(false);}} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${battleMode ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400'}`}>Battle Mode</button>
          </div>
        </div>

        {/* BATTLE MODE INTERFACE */}
        {battleMode && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500 text-left">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {battleIds.length < 2 ? (
                  <div className="lg:col-span-2 bg-rose-50 border-2 border-dashed border-rose-200 rounded-[2.5rem] p-12 text-center">
                      <Swords size={48} className="mx-auto text-rose-300 mb-4" />
                      <h3 className="text-lg font-black text-rose-900">Battle Arena Waiting</h3>
                      <p className="text-rose-600 text-sm font-medium">Select exactly two candidates from the list below to begin the technical showdown.</p>
                  </div>
                ) : (
                  battleCandidates.map((c, i) => {
                    const data = i === 0 ? battleData?.candidateA : battleData?.candidateB;
                    return (
                      <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-full h-2 ${i === 0 ? 'bg-blue-500' : 'bg-rose-500'}`}></div>
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <h4 className="text-2xl font-black text-slate-900">{c.name}</h4>
                                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{c.details?.college || 'Institution Hidden'}</p>
                              </div>
                              <div className="text-4xl font-black text-slate-900">{c.fairScore || c.score}%</div>
                          </div>
                          
                          {isComparingBattle ? (
                            <div className="flex items-center justify-center py-10 text-slate-300 animate-pulse">
                               <Loader2 className="animate-spin mr-2" /> <span className="font-bold text-xs uppercase">AI Audit in Progress...</span>
                            </div>
                          ) : data ? (
                            <div className="space-y-4">
                               <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                  <span className="text-[10px] font-black text-emerald-600 uppercase mb-2 block">Technical Pros</span>
                                  <ul className="text-xs text-slate-700 space-y-1">
                                      {data.pros?.map((p:string) => (
                                        <li key={p} className="flex items-start gap-2">
                                          <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5" />
                                          {p}
                                        </li>
                                      ))}
                                  </ul>
                               </div>
                               <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                  <span className="text-[10px] font-black text-rose-600 uppercase mb-2 block">Identified Gaps</span>
                                  <ul className="text-xs text-slate-700 space-y-1">
                                      {data.cons?.map((p:string) => (
                                        <li key={p} className="flex items-start gap-2">
                                          <div className="w-1 h-1 rounded-full bg-rose-400 mt-1.5" />
                                          {p}
                                        </li>
                                      ))}
                                  </ul>
                               </div>
                               <p className="text-[11px] font-bold text-indigo-600 p-2 italic border-l-2 border-indigo-200 bg-indigo-50">
                                  "{data.edge}"
                               </p>
                            </div>
                          ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              {battleData && !isComparingBattle && (
                <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border-t-4 border-amber-400 animate-in slide-in-from-bottom-4">
                   <div className="flex items-center gap-3 mb-2 text-amber-400">
                      <ShieldCheck size={20} />
                      <h4 className="font-black text-sm uppercase tracking-widest">Final Audit Verdict</h4>
                   </div>
                   <p className="text-sm text-slate-300 font-medium italic leading-relaxed">{battleData.verdict}</p>
                </div>
              )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-4">Target Audit Role</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Job Title" value={jobTitle} onChange={(e) => { setJobTitle(e.target.value); syncToGlobalStorage(e.target.value, jobDescription, candidates); }} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                <textarea placeholder="Paste Full Job Description for AI context..." value={jobDescription} onChange={(e) => { setJobDescription(e.target.value); syncToGlobalStorage(jobTitle, e.target.value, candidates); }} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-[10px] font-bold">
                  <button onClick={() => setUploadMode("manual")} className={`flex-1 py-2 rounded-lg transition ${uploadMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>MANUAL</button>
                  <button onClick={() => setUploadMode("bulk")} className={`flex-1 py-2 rounded-lg transition ${uploadMode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>BULK AUDIT</button>
                </div>

                {uploadMode === "manual" ? (
                  <div className="space-y-3">
                    <input type="text" placeholder="Candidate Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm" />
                    <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm" />
                    <input type="file" accept=".pdf,.docx" onChange={(e) => e.target.files && setResume(e.target.files[0])} className="text-[10px] block w-full text-slate-400" />
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-100 rounded-2xl p-6 text-center hover:bg-slate-50 transition relative">
                    <input type="file" multiple accept=".pdf,.docx" onChange={(e) => setBulkFiles(Array.from(e.target.files || []))} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="mx-auto mb-2 text-slate-300" size={24} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Resumes Ready: {bulkFiles?.length || 0}</p>
                  </div>
                )}

                <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest mt-6 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 disabled:opacity-50">
                  {isAnalyzing ? `Auditing (${progress}%)` : "Run Pipeline Audit"}
                </button>
              </div>
            </div>
            <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-amber-400">
                <Zap size={18} fill="currentColor" />
                <h2 className="text-xs font-black uppercase tracking-widest">Decision Engine</h2>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Min Score %</label>
                    <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full bg-white/10 border-none rounded-lg p-2 text-xs mt-1" />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Limit</label>
                    <input type="number" value={shortlistLimit} onChange={(e) => setShortlistLimit(Number(e.target.value))} className="w-full bg-white/10 border-none rounded-lg p-2 text-xs mt-1" />
                  </div>
                </div>
                <button onClick={applySmartDecisions} className="w-full bg-amber-400 text-slate-900 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-amber-300 transition">Apply Logic</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4 text-left">
            {selectedIds.length > 0 && (
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center animate-in slide-in-from-top-4">
                <span className="text-sm font-medium">{selectedIds.length} Selected Profiles</span>
                <div className="flex gap-2">
                  <button onClick={() => handleBulkStatusUpdate("Shortlisted")} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Shortlist</button>
                  <button onClick={() => handleBulkStatusUpdate("Rejected")} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-xs font-bold flex items-center gap-1"><XCircle size={14}/> Reject</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-5 text-left w-10"></th>
                    <th className="px-6 py-5 text-left">Candidate Info</th>
                    {compareMode ? (
                      <>
                        <th className="px-6 py-5 text-center text-emerald-600">Fair %</th>
                        <th className="px-6 py-5 text-center text-amber-500">Bias %</th>
                        <th className="px-6 py-5 text-center">Bias Delta</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-5 text-left">Status</th>
                        <th className="px-6 py-5 text-center">AI Audit Score</th>
                      </>
                    )}
                    <th className="px-6 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {candidates.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCandidate(c)}
                      className={`group hover:bg-indigo-50/20 transition-all cursor-pointer ${selectedIds.includes(c.id) || battleIds.includes(c.id) ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                             <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300 text-indigo-600" />
                             {battleMode && (
                                <button onClick={() => toggleBattleSelect(c.id)} className={`p-1.5 rounded-lg transition-all ${battleIds.includes(c.id) ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
                                    <Swords size={12} />
                                </button>
                             )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-110 transition-transform">
                             {c.invited ? <Mail size={14} className="text-emerald-500 animate-pulse" /> : c.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                              {c.name}
                              {c.invited && <span className="text-[8px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase font-black">Email Sent</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{c.email}</p>
                          </div>
                        </div>
                      </td>

                      {compareMode ? (
                        <>
                          <td className="px-6 py-5 text-center font-black text-emerald-600 text-base">{c.fairScore || c.score}%</td>
                          <td className="px-6 py-5 text-center font-black text-amber-500 text-base">{c.biasScore || 0}%</td>
                          <td className="px-6 py-5 text-center">
                             <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${c.biasScore > c.fairScore ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                               +{Math.max(0, (c.biasScore || 0) - (c.fairScore || 0))} PTS
                             </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={c.status || "Screening"} 
                              onChange={(e) => handleStatusChange(e, c.id)}
                              className={`text-[9px] font-black px-3 py-1.5 rounded-xl border-none focus:ring-0 shadow-sm uppercase tracking-tighter
                                ${c.status === "Shortlisted" ? 'bg-emerald-50 text-emerald-600' : 
                                  c.status === "Rejected" ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}
                            >
                              <option value="Screening">Screening</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                          <td className="px-6 py-5 text-center font-black text-indigo-600 text-lg">{c.fairScore || c.score}%</td>
                        </>
                      )}

                      <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                           <button onClick={() => {setSelectedCandidate(c); setIsModalOpen(true)}} className="p-2 text-slate-400 hover:text-indigo-600 transition hover:bg-indigo-50 rounded-lg">
                              <Info size={18} />
                           </button>
                           {c.status === "Shortlisted" && (
                            <button onClick={() => handleConductInterview(c)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md group/call relative">
                              <PhoneCall size={14} />
                            </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* REASONING PANEL */}
      {selectedCandidate && !isModalOpen && (
        <aside className="fixed right-0 top-0 h-full w-[400px] bg-slate-900 text-white p-8 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex justify-between items-center mb-6 text-left">
              <div>
                <h2 className="text-xl font-black tracking-tight">Technical Audit</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AI Reasoning Log</p>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-white/10 rounded-xl transition text-slate-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6 text-left custom-scrollbar">
              <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-lg shadow-lg">
                        {selectedCandidate.name?.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-none">{selectedCandidate.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">{selectedCandidate.email}</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-slate-500 font-black uppercase block tracking-tighter">Unbiased Match</span>
                        <span className="text-xl font-black text-emerald-500">{selectedCandidate.fairScore || selectedCandidate.score}%</span>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[9px] text-slate-500 font-black uppercase block tracking-tighter">Prestige Check</span>
                        <span className="text-xl font-black text-amber-500">{selectedCandidate.biasScore || 0}%</span>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-[2.5rem]">
                 <div className="flex items-center gap-2 mb-3 text-emerald-500">
                    <Scale size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Candidate Strengths</span>
                 </div>
                 <p className="text-sm text-slate-300 leading-relaxed italic">"{selectedCandidate.reasoning?.fair || selectedCandidate.explanation}"</p>
              </div>

              <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-[2.5rem]">
                 <div className="flex items-center gap-2 mb-3 text-amber-500">
                    <Zap size={18} fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Gap Analysis</span>
                 </div>
                 <p className="text-sm text-slate-300 leading-relaxed">
                    {selectedCandidate.reasoning?.bias || 'No critical technical gaps identified for the targeted role.'}
                 </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 font-black uppercase">Technical Stack</span>
                    <div className="flex gap-1">
                        {(selectedCandidate.details?.skills || []).slice(0, 3).map((s:string) => (
                            <span key={s} className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-black">{s}</span>
                        ))}
                    </div>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button onClick={() => setSelectedCandidate(null)} className="w-full bg-white/10 text-slate-400 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/20 transition">Exit Auditor</button>
            </div>
        </aside>
      )}

      {/* MODAL */}
      {isModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">{selectedCandidate.name?.charAt(0)}</div>
                    <div className="text-left">
                      <h3 className="text-xl font-black text-slate-900">{selectedCandidate.name}</h3>
                      <p className="text-xs text-slate-400 font-medium">{selectedCandidate.email}</p>
                    </div>
                 </div>
                 <div className="text-3xl font-black text-indigo-600">{selectedCandidate.fairScore || selectedCandidate.score}%</div>
              </div>
              <p className="p-5 bg-slate-50 rounded-2xl text-sm italic text-slate-600 mb-6 text-left">"{selectedCandidate.explanation}"</p>
              <div className="flex gap-3">
                 <button onClick={() => {setIsModalOpen(false); setSelectedCandidate(null)}} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition">Close Preview</button>
                 {selectedCandidate.status === "Shortlisted" && (
                    <button onClick={() => handleConductInterview(selectedCandidate)} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                        <Zap size={14}/> Interview Setup
                    </button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}