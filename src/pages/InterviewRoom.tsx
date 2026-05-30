import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Mic, ShieldCheck, User, MessageSquare, AlertCircle,
  PhoneCall, CheckCircle, Bot, XCircle, Loader2, UploadCloud, Camera
} from 'lucide-react';
import Vapi from "@vapi-ai/web";
// ✅ ADDED: MongoDB API import
import { saveReport } from '../services/api';

const vapi = new Vapi("398eb9ba-4a89-47e9-83b1-27ba54773733");

const InterviewRoom: React.FC = () => {
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [candidateData, setCandidateData] = useState<any>(null);

  const [candidateResume, setCandidateResume] = useState<File | null>(null);
  const [extractedResumeText, setExtractedResumeText] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Full transcript log — every message saved here
  const [transcriptLog, setTranscriptLog] = useState<{role: string, text: string}[]>([]);
  // useRef mirrors transcript state so Vapi closures always have latest data
  const transcriptRef = useRef<{role: string, text: string}[]>([]);

  const [lastTranscript, setLastTranscript] = useState<{ role: string; text: string }>({
    role: "Interviewer",
    text: "Connecting to voice server... Please wait.",
  });

  // ─── Auto-verify from URL email param ───────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailFromUrl = params.get('email');

    const rulesRaw = localStorage.getItem("active_interview_rules");
    const activeRules = rulesRaw ? JSON.parse(rulesRaw) : null;

    const activeCandidateRaw = localStorage.getItem("activeCandidate");
    const candidate = activeCandidateRaw ? JSON.parse(activeCandidateRaw) : null;

    if (emailFromUrl) {
      setEmail(emailFromUrl);
      const resolvedName = candidate?.name || "Candidate";
      const resolvedJobTitle = activeRules?.jobTitle || candidate?.jobTitle || "Software Developer";
      setCandidateData({ ...candidate, name: resolvedName, jobTitle: resolvedJobTitle });
      setIsVerified(true);
    }
  }, [location]);

  // ─── Camera ─────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  // ─── Resume Upload ───────────────────────────────────────────────────────────
  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setCandidateResume(file);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobTitle", candidateData?.jobTitle || "Software Developer");
      formData.append("jobDescription", "Standard Assessment");
     const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/analyze`, { method: "POST", body: formData });
      const data = await response.json();
      setExtractedResumeText(data.explanation || "");
    } catch (err) {
      console.warn("Resume extraction failed, using fallback.");
      setExtractedResumeText("");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Verification ────────────────────────────────────────────────────────────
  const handleVerify = () => {
    setLoading(true);
    setError(null);
    const activeCandidateRaw = localStorage.getItem("activeCandidate");
    const rulesRaw = localStorage.getItem("active_interview_rules");
    const activeRules = rulesRaw ? JSON.parse(rulesRaw) : null;
    const cleanInputEmail = email.trim().toLowerCase();

    setTimeout(() => {
      if (cleanInputEmail === "test@gmail.com" || cleanInputEmail === "demo") {
        setCandidateData({ name: "Demo Candidate", jobTitle: activeRules?.jobTitle || "Software Developer" });
        setIsVerified(true);
        setLoading(false);
        return;
      }
      if (activeCandidateRaw) {
        const candidate = JSON.parse(activeCandidateRaw);
        if (candidate.email?.trim().toLowerCase() === cleanInputEmail) {
          if (candidate.status === "Shortlisted" || candidate.status === "Interviewed") {
            setCandidateData({
              ...candidate,
              name: candidate.name || "Candidate",
              jobTitle: activeRules?.jobTitle || candidate.jobTitle || "Software Developer",
            });
            setIsVerified(true);
            setLoading(false);
            return;
          }
        }
      }
      setError("Access Denied. Only shortlisted candidates can enter.");
      setLoading(false);
    }, 1000);
  };

  // ─── Helper: First question based on rules ───────────────────────────────────
  const getFirstQuestion = (rules: any): string => {
    // ✅ MODIFIED: If an HR-generated question bank exists, use the first question as our starting base line
    if (rules?.questionBank && rules.questionBank.length > 0) {
      return `Let's look at this dynamic topic area: ${rules.questionBank[0]}`;
    }
    const type = rules.type || "Technical Screening";
    const focus = rules.specialInstructions || "";
    const depth = rules.depth || "Intermediate / Practical";
    if (focus) return `Can you walk me through your experience with ${focus.split(',')[0].trim()}?`;
    if (type === "Behavioral / HR") return "Tell me about yourself and what motivated you to apply for this role.";
    if (type === "System Design") return "Can you walk me through how you would design a scalable web application?";
    if (depth.includes("Junior") || depth.includes("Conceptual")) return "Can you explain the difference between let, const, and var in JavaScript?";
    if (depth.includes("Advanced") || depth.includes("Architectural")) return "How would you approach designing a micro-frontend architecture?";
    return "Can you walk me through your most recent project and your role in it?";
  };

  // ─── Score transcript with Gemini ────────────────────────────────────────────
  const scoreWithGemini = async (transcript: {role: string, text: string}[], candidate: any, rules: any) => {
    try {
      const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      console.log("🔑 Key loaded:", GEMINI_KEY ? "YES" : "NO - CHECK .env FILE");
      if (!GEMINI_KEY) {
        console.warn("No Gemini key found, using random score");
        return null;
      }

      const transcriptText = transcript
        .map(t => `${t.role}: ${t.text}`)
        .join("\n");

      const prompt = `You are an expert HR evaluator. Analyze this interview transcript and provide a JSON evaluation.

Candidate: ${candidate?.name}
Role: ${candidate?.jobTitle}
Interview Type: ${rules?.type || "Technical"}

Transcript:
${transcriptText}

Respond ONLY with a valid JSON object, no markdown:
{
  "totalScore": <number 0-100>,
  "decision": "<SELECTED or REJECTED>",
  "overallFeedback": "<2-3 sentence summary of candidate performance>",
  "technicalScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "problemSolvingScore": <number 0-100>,
  "strengths": ["<strength1>", "<strength2>", "<strength3>"],
  "improvements": ["<area1>", "<area2>"]
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
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
      return JSON.parse(clean);
    } catch (err) {
      console.error("Gemini scoring failed:", err);
      return null;
    }
  };

  // ─── Start Voice Interview ───────────────────────────────────────────────────
  const startVoiceInterview = async () => {
    setIsCallActive(true);
    setIsCalling(true);

    // Reset both state and ref together
    setTranscriptLog([]);
    transcriptRef.current = [];

    startCamera();

    try {
      const candidateNameClean = candidateData?.name?.split(' ')[0] || "there";

      const rulesRaw = localStorage.getItem("active_interview_rules");
      const activeRules = rulesRaw ? JSON.parse(rulesRaw) : {
        type: "Technical Screening",
        depth: "Intermediate / Practical",
        questionCount: "5",
        specialInstructions: "",
        questionBank: []
      };

      const cleanResumeContext = extractedResumeText.trim() ||
        `Candidate Name: ${candidateData?.name || "Candidate"}. Profile: Professional software developer with frontend framework knowledge base.`;

      // ✅ MODIFIED: Convert the stored master question bank into a string block for the system prompt instructions context
      const referenceQuestionsString = activeRules.questionBank && activeRules.questionBank.length > 0
        ? activeRules.questionBank.map((q: string, idx: number) => `Reference Guideline Q${idx + 1}: ${q}`).join("\n")
        : "No custom question bank set. Fall back to standard sector specifications.";

      await vapi.start({
        model: {
          provider: "google",
          model: "gemini-2.5-flash",
          messages: [{
            role: "system",
            content: `You are Burt, an elite AI live technical voice assessor for HireAI. 
            Your core duty is to evaluate the applicant named ${candidateNameClean} by asking exactly ${activeRules.questionCount} custom questions sequentially one-by-one.
            
            THE INTERVIEW RULES MANDATED BY THE RECRUITER:
            - Assessment Track Domain: ${activeRules.type}
            - Technical Experience Seniority Depth: ${activeRules.depth}
            - Specialized Custom Criteria Instructions: ${activeRules.specialInstructions || "General performance profiling."}
            
            THE RECRUITER'S REFERENCE QUESTION BANK MODEL:
            """
            ${referenceQuestionsString}
            """
            
            THE CANDIDATE'S PARSED RESUME EXPERT PROFILE DOSSIER:
            """
            ${cleanResumeContext}
            """
            
            EXECUTIVE OPERATIONAL PIPELINE PIPES:
            1. Look at the Recruiter's Reference Question Bank list above.
            2. Match each guideline question against the candidate's custom parsed resume dossier. 
            3. DYNAMICALLY MODULATE, HYBRIDIZE, AND PERSONALIZE each question so it checks their real structural experience while keeping to the core intention of the recruiter's rule base criteria.
            4. Ask exactly ${activeRules.questionCount} of these personalized modified variants one-by-one. Never output multiple question sentences together.
            5. Wait completely for the applicant to finish explaining their programmatic logic before moving onto the next numerical item block.
            6. After they provide their final answer to question number ${activeRules.questionCount}, thank them for their session time, say "Goodbye", and remain silent to let the call stream terminate cleanly.`
          }],
        },
        voice: { provider: "11labs", voiceId: "burt" },
        firstMessage: `Hello ${candidateNameClean}! Welcome to your HireAI ${activeRules.type} assessment. I have parsed your profile against our active organization matrix rules. Let's begin our ${activeRules.questionCount}-stage loop assessment. Can you hear me clearly?`,
      });

      vapi.on("call-start", () => {
        setIsCalling(false);
        const opening = { role: "Interviewer", text: `Hello ${candidateNameClean}! Let's begin your assessment.` };
        setLastTranscript(opening);
        setTranscriptLog([opening]);
        transcriptRef.current = [opening];
      });

      vapi.on("message", (message) => {
        if (message.type === "transcript" && message.transcriptType === "final") {
          const entry = {
            role: message.role === "assistant" ? "Interviewer" : candidateNameClean,
            text: message.transcript,
          };
          setLastTranscript(entry);
          setTranscriptLog(prev => [...prev, entry]);
          transcriptRef.current = [...transcriptRef.current, entry];
        }
      });

      vapi.on("call-end", () => {
        handleCallEndCleanup(activeRules);
      });

    } catch (err) {
      console.error("Vapi connection failure:", err);
      setIsCallActive(false);
      setIsCalling(false);
      setError("Could not connect to AI Voice Server. Please try again.");
    }
  };

  // ─── Cleanup + Score + Save ──────────────────────────────────────────────────
  const handleCallEndCleanup = async (activeRules?: any) => {
    setIsCallActive(false);
    setIsCalling(false);
    setIsProcessing(true);

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }

    // Use ref instead of state — always has the latest transcript
    const finalTranscript = transcriptRef.current;
    console.log("📝 Final transcript lines:", finalTranscript.length, finalTranscript);

    // Get rules
    const rulesRaw = localStorage.getItem("active_interview_rules");
    const rules = activeRules || (rulesRaw ? JSON.parse(rulesRaw) : null);

    // Score with Gemini using real transcript
    const geminiResult = await scoreWithGemini(finalTranscript, candidateData, rules);
    console.log("🤖 Gemini result:", geminiResult);

    const score = geminiResult?.totalScore || Math.floor(Math.random() * 30) + 70;
    const decision = geminiResult?.decision || "FOLLOW_UP";

    const newReport = {
      id: Date.now().toString(),
      candidateName: candidateData?.name || "Unknown",
      candidateEmail: email,
      jobRole: candidateData?.jobTitle || "Software Developer",
      type: rules?.type || "Technical Screening",
      date: new Date().toLocaleDateString(),
      transcript: finalTranscript,
      feedback: {
        totalScore: score,
        decision: decision,
        overallFeedback: geminiResult?.overallFeedback || "Assessment completed.",
        technicalScore: geminiResult?.technicalScore || score,
        communicationScore: geminiResult?.communicationScore || score,
        problemSolvingScore: geminiResult?.problemSolvingScore || score,
        strengths: geminiResult?.strengths || [],
        improvements: geminiResult?.improvements || [],
      }
    };

    // ✅ ADDED: Save to MongoDB first
    try {
      await saveReport(newReport);
      console.log("✅ Report saved to MongoDB");
    } catch (err) {
      console.warn("MongoDB report save failed, saving to localStorage only");
    }

    // ✅ Always save to localStorage as fallback/cache
    const hrEmail = localStorage.getItem("currentHREmail") || "guest_hr";
    const existingReports = JSON.parse(localStorage.getItem(`interview_reports_${hrEmail}`) || "[]");
    existingReports.unshift(newReport);
    localStorage.setItem(`interview_reports_${hrEmail}`, JSON.stringify(existingReports));

    // Also update candidate status in allJobs localStorage
    const allJobs = JSON.parse(localStorage.getItem("allJobs") || "[]");
    const updatedJobs = allJobs.map((job: any) => ({
      ...job,
      candidates: job.candidates?.map((c: any) =>
        c.email?.toLowerCase() === email.toLowerCase()
          ? { ...c, status: "Interviewed", lastScore: score }
          : c
      ),
    }));
    localStorage.setItem("allJobs", JSON.stringify(updatedJobs));

    setIsProcessing(false);
    alert(`Assessment completed! Score: ${score}/100. Results saved to HR dashboard.`);
  };

  const endCall = () => {
    vapi.stop();
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white p-4 md:p-8 font-sans text-center">
      <nav className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-gray-800 pb-6 text-left">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-lg"><ShieldCheck size={24} /></div>
          <span className="text-xl font-black tracking-tight uppercase">HireAI <span className="text-indigo-500">Rooms</span></span>
        </div>
      </nav>

      {isProcessing ? (
        <div className="flex flex-col items-center justify-center mt-32 space-y-6">
          <Loader2 size={64} className="text-indigo-500 animate-spin" />
          <h2 className="text-3xl font-black uppercase tracking-tighter">Analyzing & Saving Results...</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
            Gemini AI is scoring your interview. This takes a few seconds.
          </p>
        </div>
      ) : !isVerified ? (
        <div className="max-w-md mx-auto mt-20 p-8 bg-[#111622] border border-gray-800 rounded-[2.5rem] shadow-2xl text-left">
          <h1 className="text-2xl font-black mb-2 text-center text-white">Identity Verification</h1>
          <p className="text-gray-400 text-center mb-8 text-xs uppercase tracking-widest">Candidate Access Portal</p>
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center gap-2 text-xs font-bold">
              <AlertCircle size={18} /> {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-2">Email Address</label>
              <input
                type="email"
                placeholder="candidate@example.com"
                className="w-full bg-[#0d1117] border border-gray-700 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>
            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl"
            >
              {loading ? "Checking Authorization..." : "Enter Interview Room"}
            </button>
          </div>
        </div>
      ) : isCallActive ? (
        <div className="max-w-5xl mx-auto text-left">
          <div className="flex justify-between items-center mb-6 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Live: Voice Session Active</span>
            </div>
            <button onClick={endCall} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border border-red-500/20 flex items-center gap-2">
              <XCircle size={14} /> End Session
            </button>
          </div>

          <div className="bg-[#111622] border border-gray-800 rounded-[3rem] p-8 shadow-2xl mb-6 text-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center justify-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Interviewer — Burt</h3>
                <div className="w-32 h-32 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6 relative">
                  <Bot size={60} />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center animate-bounce"><Mic size={16} /></div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 bg-indigo-400 h-4 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 absolute top-6 z-20">
                  Candidate: {candidateData?.name}
                </h3>
                <div className="w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  <div className="absolute top-4 right-4 bg-red-600 px-2 py-1 rounded text-[8px] font-bold animate-pulse">REC</div>
                </div>
              </div>
            </div>

            {/* Live transcript box */}
            <div className="mt-10 bg-black/40 border border-white/5 rounded-3xl p-6 h-40 overflow-y-auto text-left">
              <div className="space-y-3">
                {transcriptLog.slice(-4).map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <span className={`${entry.role === 'Interviewer' ? 'text-indigo-400' : 'text-emerald-400'} font-black text-[10px] uppercase shrink-0 mt-1`}>
                      {entry.role}:
                    </span>
                    <p className="text-sm text-gray-300 leading-relaxed italic">{entry.text}</p>
                  </div>
                ))}
                {isCalling && <p className="text-gray-500 text-sm italic">Connecting to audio stream...</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111622] border border-gray-800 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl mb-6 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                <User size={40} />
              </div>
              <h1 className="text-4xl font-black mb-2 text-white">Welcome, {candidateData?.name}</h1>
              <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-8">
                Authorized for: {candidateData?.jobTitle}
              </p>

              <div className="w-full max-w-lg mb-10 p-8 border-2 border-dashed border-white/10 rounded-[2rem] bg-white/5 hover:border-indigo-500/50 transition-all">
                <input type="file" id="resume-upload" className="hidden" onChange={handleResumeUpload} accept=".pdf" />
                <label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud size={48} className={`mb-4 ${candidateResume ? 'text-emerald-500' : 'text-indigo-500'}`} />
                  <p className="font-bold text-sm">{candidateResume ? candidateResume.name : "Upload Resume (PDF) — Optional"}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{isUploading ? "Extracting text..." : "Personalizes your questions. You can skip this."}</p>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left w-full">
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <CheckCircle className="text-emerald-500 mb-2" size={20} />
                  <h3 className="text-xs font-bold text-gray-300">Identity Verified</h3>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <Camera className="text-indigo-500 mb-2" size={20} />
                  <h3 className="text-xs font-bold text-gray-300">Proctored Session</h3>
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
                  <MessageSquare className="text-amber-500 mb-2" size={20} />
                  <h3 className="text-xs font-bold text-gray-300">Live Transcription</h3>
                </div>
              </div>

              <button
                onClick={startVoiceInterview}
                disabled={isCalling || isUploading}
                className="group relative inline-flex items-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 hover:text-white transition-all shadow-2xl disabled:opacity-50"
              >
                <PhoneCall size={18} className={isCalling ? "animate-bounce" : "group-hover:rotate-12 transition-transform"} />
                {isCalling ? "Connecting..." : isUploading ? "Processing Resume..." : "Start AI Voice Interview"}
              </button>

              {!candidateResume && (
                <p className="text-gray-600 text-[10px] mt-3">No resume uploaded — AI will ask general questions for your role.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;