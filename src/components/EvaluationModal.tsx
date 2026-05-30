import React from 'react';
import { X, CheckCircle, AlertTriangle, MessageSquare, BrainCircuit, BarChart3, ThumbsUp, ThumbsDown } from 'lucide-react';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateData: any;
}

const EvaluationModal: React.FC<EvaluationModalProps> = ({ isOpen, onClose, candidateData }) => {
  if (!isOpen || !candidateData) return null;

  const feedback = candidateData.feedback || {};
  const transcript = candidateData.transcript || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#111622] border border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1a202e]">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BrainCircuit size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Evaluation Report</h2>
              {/* ✅ Real candidate name */}
              <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                Candidate: {candidateData.candidateName} · {candidateData.jobRole}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Score & Decision */}
          <div className="space-y-6">
            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Overall Score</p>
              <div className="flex items-baseline gap-2">
                {/* ✅ Real Gemini score */}
                <span className="text-6xl font-black text-white">{feedback.totalScore ?? "—"}</span>
                <span className="text-slate-600 font-bold">/100</span>
              </div>
              <div className="mt-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${
                  feedback.decision === 'SELECTED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : feedback.decision === 'REJECTED'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {feedback.decision === 'SELECTED' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  {feedback.decision || "PENDING"}
                </div>
              </div>
            </div>

            {/* ✅ Real skill scores from Gemini */}
            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={14} className="text-indigo-400" /> Skill Breakdown
              </h4>
              {[
                { label: 'Technical Accuracy', score: feedback.technicalScore ?? feedback.totalScore ?? 0 },
                { label: 'Communication', score: feedback.communicationScore ?? feedback.totalScore ?? 0 },
                { label: 'Problem Solving', score: feedback.problemSolvingScore ?? feedback.totalScore ?? 0 },
              ].map((skill, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold mb-1 uppercase text-slate-500">
                    <span>{skill.label}</span>
                    <span>{skill.score}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${skill.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ Strengths */}
            {feedback.strengths?.length > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-3xl">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ThumbsUp size={14} /> Strengths
                </h4>
                <ul className="space-y-1">
                  {feedback.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ✅ Improvements */}
            {feedback.improvements?.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <ThumbsDown size={14} /> Areas to Improve
                </h4>
                <ul className="space-y-1">
                  {feedback.improvements.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Transcript + AI Summary */}
          <div className="lg:col-span-2 space-y-6">

            {/* ✅ Real transcript */}
            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800 flex flex-col" style={{minHeight: '300px'}}>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={14} className="text-indigo-400" /> Interview Transcript
              </h4>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {transcript.length === 0 ? (
                  <p className="text-slate-600 text-sm italic">No transcript recorded for this session.</p>
                ) : (
                  transcript.map((entry: any, i: number) => (
                    <div key={i} className={`space-y-1 ${entry.role !== 'Interviewer' ? 'text-right' : ''}`}>
                      <p className={`text-[10px] font-bold uppercase ${entry.role === 'Interviewer' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                        {entry.role}
                      </p>
                      <p className={`text-sm p-3 rounded-2xl border inline-block max-w-[85%] ${
                        entry.role === 'Interviewer'
                          ? 'text-slate-300 bg-slate-900/50 border-slate-800 text-left'
                          : 'text-white bg-indigo-600/20 border-indigo-500/20'
                      }`}>
                        {entry.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ✅ Real Gemini AI summary */}
            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-400" /> AI Reasoning Summary
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{feedback.overallFeedback || "No AI summary available for this session."}"
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-4 bg-[#1a202e]">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-700 text-sm font-bold hover:bg-slate-800 transition-all">
            Close
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
            Send Offer Letter
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;