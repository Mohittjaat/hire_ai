import React from 'react';
import { X, CheckCircle, AlertTriangle, MessageSquare, BrainCircuit, BarChart3 } from 'lucide-react';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateData: any;
}

const EvaluationModal: React.FC<EvaluationModalProps> = ({ isOpen, onClose, candidateData }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#111622] border border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1a202e]">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BrainCircuit size={24} className="text-white"/>
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Evaluation Report</h2>
              <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Candidate: {candidateData.candidateName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Stats & Decision */}
          <div className="space-y-6">
            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Overall Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">{candidateData.feedback.totalScore}</span>
                <span className="text-slate-600 font-bold">/100</span>
              </div>
              <div className="mt-6">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm ${
                  candidateData.feedback.decision === 'SELECTED' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {candidateData.feedback.decision === 'SELECTED' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                  {candidateData.feedback.decision}
                </div>
              </div>
            </div>

            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={14} className="text-indigo-400"/> Skill Breakdown
              </h4>
              {[
                { label: 'Technical Accuracy', score: candidateData.feedback.totalScore - 5 },
                { label: 'Logic & Reasoning', score: 88 },
                { label: 'Communication', score: 92 }
              ].map((skill, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold mb-1 uppercase text-slate-500">
                    <span>{skill.label}</span>
                    <span>{skill.score}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${skill.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (2 spans): Transcript & Detailed Feedback */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800 h-[300px] flex flex-col">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={14} className="text-indigo-400"/> Interview Transcript
              </h4>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {/* Mock Transcript items */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase">AI Interviewer</p>
                  <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">How would you optimize a search operation in a massive dataset?</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Candidate</p>
                  <p className="text-sm text-white bg-indigo-600/20 p-3 rounded-2xl border border-indigo-500/20 inline-block">I would use a Hash Map for O(1) average time complexity or a Trie if it's string-based.</p>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0c14] p-6 rounded-3xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-400"/> AI Reasoning Summary
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "The candidate demonstrated high proficiency in data structures. Their explanation of Hash Maps was technically sound. Communication was clear, although they took slightly longer to explain the Trie implementation. Highly recommended for the {candidateData.jobRole} position based on technical depth."
              </p>
            </div>
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 flex justify-end gap-4 bg-[#1a202e]">
          <button className="px-6 py-2.5 rounded-xl border border-slate-700 text-sm font-bold hover:bg-slate-800 transition-all">Download PDF</button>
          <button className="px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Send Offer Letter</button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;