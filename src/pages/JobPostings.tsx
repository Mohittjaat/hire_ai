import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Briefcase, Plus, TrendingUp } from 'lucide-react';

const JobPostings = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [newJob, setNewJob] = useState({
    title: '',
    department: '',
    location: '',
    type: '',
    skills: '',
    experience: '',
    description: ''
  });

  // 1. LOAD DATA: Fetch from localStorage on mount
  useEffect(() => {
    const storedJobs = JSON.parse(localStorage.getItem('allJobs') || '[]');
    setJobs(storedJobs);
  }, []);

  // 2. LIVE SYNC LOGIC: Dynamically calculate stats from candidates array
  const syncedJobs = useMemo(() => {
    return jobs.map(job => {
      const candidates = job.candidates || [];
      const total = candidates.length;
      
      // Screened: Candidates who have an AI score
      const screened = candidates.filter((c: any) => (c.score || 0) > 0).length;
      
      // Shortlisted: Candidates marked as Shortlisted
      const shortlisted = candidates.filter((c: any) => c.status === "Shortlisted").length;
      
      // Progress: Percentage of candidates screened
      const progress = total > 0 ? Math.round((screened / total) * 100) : 0;
      
      // Avg Match Quality: Average AI score for the pool
      const avgMatch = total > 0 
        ? Math.round(candidates.reduce((acc: number, c: any) => acc + (c.fairScore || c.score || 0), 0) / total) 
        : 0;

      return { 
        ...job, 
        applicants: total, 
        screened, 
        shortlisted, 
        progress, 
        avgMatchQuality: avgMatch 
      };
    });
  }, [jobs]);

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const jobToAdd = {
      ...newJob,
      id: Date.now(),
      status: 'Active',
      candidates: [] // Start with empty array
    };
    
    const updatedJobs = [jobToAdd, ...jobs];
    setJobs(updatedJobs);
    localStorage.setItem('allJobs', JSON.stringify(updatedJobs));
    
    // Reset form
    setNewJob({ title: '', department: '', location: '', type: '', skills: '', experience: '', description: '' });
  };

  // 3. NAVIGATION SYNC: Store filter and go to Dashboard
  const handleViewDetails = (job: any) => {
    // Save specific job details so Candidate Screening & Bulk Upload can auto-fill
    localStorage.setItem('active_job_filter', job.title);
    localStorage.setItem('active_job_description', job.description);
    // Navigating specifically to the dashboard as requested
    navigate('/dashboard');
  };

  return (
    <div className="p-8 bg-[#f8fafc] min-h-screen text-left">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Job Postings</h1>
        <p className="text-sm text-slate-500 mt-1">Create and manage job openings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT SIDEBAR: CREATE JOB FORM */}
        <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden h-fit sticky top-8">
          <div className="p-6 border-b border-slate-50">
            <h3 className="font-bold text-slate-900 text-lg">Create Job</h3>
          </div>
          
          <form onSubmit={handleCreateJob} className="p-6 space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Job Title</label>
              <input 
                required
                value={newJob.title}
                onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                placeholder="e.g. Senior Software Engineer" 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Department</label>
              <select 
                value={newJob.department}
                onChange={(e) => setNewJob({...newJob, department: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none cursor-pointer text-slate-600"
              >
                <option value="">Select department</option>
                <option>Engineering</option>
                <option>Design</option>
                <option>Marketing</option>
                <option>DevOps</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Location</label>
              <input 
                value={newJob.location}
                onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                placeholder="e.g. Remote, San Francisco" 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Employment Type</label>
              <select 
                value={newJob.type}
                onChange={(e) => setNewJob({...newJob, type: e.target.value})}
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none cursor-pointer text-slate-600"
              >
                <option value="">Select type</option>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Intern</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Required Skills</label>
              <input 
                value={newJob.skills}
                onChange={(e) => setNewJob({...newJob, skills: e.target.value})}
                placeholder="React, TypeScript, Node.js" 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Experience Required</label>
              <input 
                value={newJob.experience}
                onChange={(e) => setNewJob({...newJob, experience: e.target.value})}
                placeholder="e.g. 5+ years" 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Job Description</label>
              <textarea 
                rows={4}
                value={newJob.description}
                onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                placeholder="Enter full job description..." 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-sm outline-none resize-none placeholder:text-slate-300"
              />
            </div>

            <button type="submit" className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]">
              <Plus size={18} /> Create Job
            </button>
          </form>
        </div>

        {/* RIGHT SIDE: SYNCED ACTIVE JOBS LIST */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            Active Jobs <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full font-black">{syncedJobs.length}</span>
          </h3>
          
          {syncedJobs.length === 0 ? (
            <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
              <Briefcase className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-400 font-medium">No active jobs found. Populate the form to start auditing.</p>
            </div>
          ) : (
            syncedJobs.map((job) => (
              <div key={job.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative text-left">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-xl font-black text-slate-900">{job.title}</h4>
                      <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-tighter">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-black">{job.department}</span>
                      <span className="flex items-center gap-1"><MapPin size={14}/> {job.location || 'Remote'}</span>
                      <span className="flex items-center gap-1"><Clock size={14}/> {job.type || 'Full-time'}</span>
                    </div>
                  </div>
                  {/* VIEW DETAILS SYNC TO DASHBOARD */}
                  <button 
                    onClick={() => handleViewDetails(job)}
                    className="text-[#8B5CF6] font-black text-xs uppercase tracking-widest hover:underline"
                  >
                    View Details
                  </button>
                </div>

                {/* SYNCED STATS BAR */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <p className="text-2xl font-black text-slate-900">{job.applicants}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicants</p>
                  </div>
                  <div className="text-center border-x border-slate-50">
                    <p className="text-2xl font-black text-slate-900">{job.screened}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Screened</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-[#8B5CF6]">{job.shortlisted}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shortlisted</p>
                  </div>
                </div>

                {/* SYNCED PROGRESS BAR */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Screening Progress</p>
                    <p className="text-sm font-black text-slate-900">{job.progress}%</p>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#8B5CF6] h-full rounded-full transition-all duration-1000" style={{width: `${job.progress}%`}}></div>
                  </div>
                </div>

                {/* MATCH QUALITY MINI CHART */}
                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[#8B5CF6]">
                      <TrendingUp size={16} />
                      <span className="text-xs font-black uppercase tracking-tight">{job.avgMatchQuality}% avg match quality</span>
                   </div>
                   <span className="text-slate-300 text-[10px] font-bold uppercase italic">Posted {new Date(job.id).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default JobPostings;