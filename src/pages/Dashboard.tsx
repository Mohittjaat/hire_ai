import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, FileText, Clock, Plus, ChevronRight, Trash2 } from 'lucide-react';
import StatCard from '../components/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
// Import the multi-tenant storage controller helper service
import { hrStorage } from '../services/hrStorage';
// ✅ ADDED: MongoDB API imports
import { getJobs, createJob, deleteJob as deleteJobAPI } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    highMatch: 0,
    avgScore: 0
  });
  // ✅ ADDED: Show HR name on dashboard
  const hrName = localStorage.getItem('currentHRName') || 'HR';
  const hrCompany = localStorage.getItem('currentHRCompany') || '';

  const calculateStats = (parsedJobs: any[]) => {
    let globalTotal = 0;
    let globalHighMatch = 0;
    let totalScoreSum = 0;

    parsedJobs.forEach((job: any) => {
      const candidates = job.candidates || [];
      globalTotal += candidates.length;
      globalHighMatch += candidates.filter((c: any) => c.score >= 85).length;
      totalScoreSum += candidates.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
    });

    setStats({
      total: globalTotal,
      highMatch: globalHighMatch,
      avgScore: globalTotal > 0 ? Math.round(totalScoreSum / globalTotal) : 0
    });
  };

  useEffect(() => {
    const loadJobs = async () => {
      try {
        // ✅ MODIFIED: Try MongoDB first
        const result = await getJobs();
        if (result.success && result.jobs?.length > 0) {
          setJobs(result.jobs);
          calculateStats(result.jobs);
          // Sync to localStorage as fallback cache
          hrStorage.setItem("allJobs", JSON.stringify(result.jobs));
          return;
        }
      } catch (err) {
        console.warn("MongoDB fetch failed, falling back to localStorage");
      }

      // ✅ FALLBACK: Load from namespaced localStorage
      const savedJobs = hrStorage.getItem("allJobs");
      if (savedJobs) {
        const parsedJobs = JSON.parse(savedJobs);
        setJobs(parsedJobs);
        calculateStats(parsedJobs);
      }
    };

    loadJobs();
  }, []);

  // --- ACTIONS ---

  const handleCreateNewJob = async () => {
    const newJob = {
      id: Date.now(),
      title: "New Position",
      description: "",
      candidates: [],
      date: new Date().toLocaleDateString()
    };
    
    try {
      // ✅ MODIFIED: Save to MongoDB first
      const result = await createJob(newJob);
      if (result.success) {
        // Use MongoDB _id if available, otherwise use local id
        const savedJob = result.job || newJob;
        const updatedJobs = [savedJob, ...jobs];
        setJobs(updatedJobs);
        hrStorage.setItem("allJobs", JSON.stringify(updatedJobs));
        navigate('/candidates', { state: { jobId: savedJob._id || savedJob.id } });
        return;
      }
    } catch (err) {
      console.warn("MongoDB save failed, using localStorage");
    }

    // ✅ FALLBACK: Save to localStorage
    const updatedJobs = [newJob, ...jobs];
    setJobs(updatedJobs);
    hrStorage.setItem("allJobs", JSON.stringify(updatedJobs));
    navigate('/candidates', { state: { jobId: newJob.id } });
  };

  const deleteJob = async (e: React.MouseEvent, id: any) => {
    e.stopPropagation();
    
    try {
      // ✅ MODIFIED: Delete from MongoDB first
      await deleteJobAPI(id.toString());
    } catch (err) {
      console.warn("MongoDB delete failed, removing from localStorage only");
    }

    // Always update local state and localStorage
    const filtered = jobs.filter(j => (j._id?.toString() || j.id?.toString()) !== id.toString());
    setJobs(filtered);
    hrStorage.setItem("allJobs", JSON.stringify(filtered));
  };

  // --- CHART DATA ---
  const chartData = [
    { name: 'Total', value: stats.total, color: '#3b82f6' },
    { name: 'High Match', value: stats.highMatch, color: '#10b981' },
    { name: 'Avg Score', value: stats.avgScore, color: '#60a5fa' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          {/* ✅ MODIFIED: Show real HR name */}
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {hrName}! 👋
          </h1>
          <p className="text-sm text-slate-500">
            {hrCompany ? `${hrCompany} · ` : ''}Manage your active recruitment pipelines.
          </p>
        </div>
        <button 
          onClick={handleCreateNewJob}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-200 text-sm font-semibold"
        >
          <Plus size={18} />
          Create New Job
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Candidates" value={stats.total.toString()} change="Global pool" icon={<Users size={20} />} />
        <StatCard title="Active Jobs" value={jobs.length.toString()} change="Current openings" icon={<Briefcase size={20} />} />
        <StatCard title="High Matches" value={stats.highMatch.toString()} change="Score >= 85%" icon={<FileText size={20} />} />
        <StatCard title="Avg Quality" value={`${stats.avgScore}%`} change="Match accuracy" icon={<Clock size={20} />} />
      </div>

      {/* CHARTS & CONTENT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: ACTIVE JOBS LIST */}
        <div className="lg:col-span-7 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-bold text-slate-900">Active Job Postings</h2>
            <button className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
              View all <ChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {jobs.length > 0 ? (
              jobs.map((job) => {
                const jobId = job._id?.toString() || job.id;
                return (
                  <div 
                    key={jobId} 
                    onClick={() => navigate('/candidates', { state: { jobId } })}
                    className="group p-5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">{job.title || "Untitled Position"}</h3>
                          <p className="text-xs text-slate-400 font-medium">Created: {job.date} • {job.candidates?.length || 0} candidates</p>
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {job.candidates?.length > 0 ? '100%' : '0%'}
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: job.candidates?.length > 0 ? '100%' : '0%' }}></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button 
                        onClick={(e) => deleteJob(e, jobId)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={20} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2rem]">
                <Briefcase className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-sm text-slate-400 font-medium">No active jobs found. Start by creating one!</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: PIPELINE ANALYSIS */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-8">Pipeline Analysis</h2>
          <div className="h-[300px] w-full">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} width={80} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-300 text-sm italic">
                No candidate data to analyze yet
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}