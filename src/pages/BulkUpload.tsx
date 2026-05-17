import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, X, AlertCircle, Play, Briefcase } from 'lucide-react';

export default function BulkUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  // --- SYNC STATE: For Job Selection ---
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // 1. LOAD JOBS: Fetch from "Source of Truth"
  useEffect(() => {
    const storedJobs = JSON.parse(localStorage.getItem('allJobs') || '[]');
    setAvailableJobs(storedJobs);

    // Check if we came from "View Details" on a specific job
    const preSelectedJob = localStorage.getItem('active_job_filter');
    if (preSelectedJob) {
      const job = storedJobs.find((j: any) => j.title === preSelectedJob);
      if (job) handleJobSelect(job.id.toString(), storedJobs);
    }
  }, []);

  // 2. AUTO-FILL LOGIC: Sync Role and Description based on Job Posting selection
  const handleJobSelect = (id: string, jobsList = availableJobs) => {
    setSelectedJobId(id);
    const job = jobsList.find((j: any) => j.id.toString() === id);
    if (job) {
      setTargetRole(job.title);
      setJobDescription(job.description || "");
      // Update session for consistency
      localStorage.setItem('active_job_filter', job.title);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleStartProcessing = () => {
    if (files.length === 0) {
      alert("Please upload at least one resume first!");
      return;
    }
    if (!selectedJobId) {
      alert("Please select a Target Job Posting first to sync data properly!");
      return;
    }
    
    // Pass files AND the specific Job ID to sync the "Applicants" counter
    navigate('/candidates', { 
      state: { 
        uploadedFiles: files,
        autoStart: true,
        targetJobId: selectedJobId,
        targetRole: targetRole,
        jobDescription: jobDescription
      } 
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 text-left">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bulk Resume Processor</h1>
        <p className="text-sm text-slate-500 mt-1">Upload resumes and sync them directly with your active job postings.</p>
      </div>

      {/* NEW: JOB SELECTION SECTION (Source of Truth Sync) */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
             <Briefcase size={20} />
           </div>
           <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Select Target Job Posting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Active Position</label>
            <select 
              value={selectedJobId}
              onChange={(e) => handleJobSelect(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="">Select a job to auto-fill...</option>
              {availableJobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Audit Context</label>
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-indigo-700 font-medium">
              Selecting a job automatically loads the specific AI screening requirements and bias configurations.
            </div>
          </div>
        </div>

        {selectedJobId && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Auto-filled Job Requirements</label>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 italic line-clamp-2">
              {jobDescription || "No specific description provided for this role."}
            </div>
          </div>
        )}
      </div>

      {/* 1. THE DROP ZONE */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
          }
        }}
        className={`relative border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all ${
          isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300'
        }`}
      >
        <input 
          type="file" 
          multiple 
          onChange={onFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Upload size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Click or drag resumes here</h3>
        <p className="text-sm text-slate-400 mt-2">Support for .PDF, .DOCX (Max 50 files at once)</p>
      </div>

      {/* 2. FILE QUEUE */}
      {files.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Upload Queue ({files.length})</h2>
            <button onClick={() => setFiles([])} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase">Clear All</button>
          </div>
          
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {files.map((file, i) => (
              <div key={i} className="p-4 flex items-center justify-between group hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</p>
                    <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-500 p-1">
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-indigo-600">
              <CheckCircleIcon size={16} />
              <span className="text-[11px] font-bold uppercase tracking-tight">
                {selectedJobId ? `Synced with ${targetRole}` : "Ready to process"}
              </span>
            </div>
            <button 
              onClick={handleStartProcessing} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <Play size={18} fill="white" />
              Start Batch Processing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper for UI consistency
function CheckCircleIcon({ size }: { size: number }) {
  return <Play size={size} className="text-emerald-500 fill-emerald-500" />;
}