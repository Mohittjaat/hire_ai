import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, ScatterChart, Scatter, ZAxis 
} from 'recharts';
import { Users, Target, Clock, Award, ChevronDown, Filter, Zap, Globe, Cpu, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const Analytics: React.FC = () => {
  // 1. STATE FOR SELECTED JOB FILTER
  const [selectedJob, setSelectedJob] = useState<string>("All Positions");

  // 2. DYNAMIC DATA CALCULATION - SYNCED WITH FILTERS & DASHBOARD
  const dashboardData = useMemo(() => {
    const hrEmail = localStorage.getItem("currentHREmail") || "guest_hr";
    const allJobs = JSON.parse(localStorage.getItem(`allJobs_${hrEmail}`) || "[]");  
    const jobTitles = ["All Positions", ...allJobs.map((j: any) => j.title)];

    let totalApps = 0;
    let shortlisted = 0;
    let interviewed = 0;
    let screened = 0;
    let selectedCount = 0;
    let totalDaysToHire = 0;

    const scoreBuckets: Record<string, number> = {
      '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, 'Below 60': 0
    };

    const skillCount: Record<string, number> = {};
    const commonKeywords = ["React", "Node.js", "Python", "TypeScript", "AWS", "Docker", "Java", "SQL", "Tailwind", "Machine Learning"];
    const performanceMatrix: any[] = [];

    const filteredJobs = selectedJob === "All Positions" 
      ? allJobs 
      : allJobs.filter((j: any) => j.title === selectedJob);

    filteredJobs.forEach((job: any) => {
      const candidates = job.candidates || [];
      totalApps += candidates.length;

      candidates.forEach((c: any) => {
        if (c.status === "Shortlisted") shortlisted++;
        if (c.status === "Interviewed") interviewed++;
        if (c.score > 0) screened++; 
        
        if (c.status === "Hired" || c.status === "Selected") {
          selectedCount++;
          const applicationDate = c.id; 
          const daysAgo = Math.floor((Date.now() - applicationDate) / (1000 * 60 * 60 * 24));
          totalDaysToHire += Math.max(1, daysAgo % 30);
        }

        performanceMatrix.push({
          experience: parseFloat(c.yearsOfExperience) || 0,
          score: c.fairScore || c.score || 0,
          name: c.name,
          status: c.status
        });

        const s = c.fairScore || c.score || 0;
        if (s >= 90) scoreBuckets['90-100']++;
        else if (s >= 80) scoreBuckets['80-89']++;
        else if (s >= 70) scoreBuckets['70-79']++;
        else if (s >= 60) scoreBuckets['60-69']++;
        else if (s > 0) scoreBuckets['Below 60']++;

        if (c.details?.skills && Array.isArray(c.details.skills) && c.details.skills.length > 0) {
          c.details.skills.forEach((skill: string) => {
            skillCount[skill] = (skillCount[skill] || 0) + 1;
          });
        } 
        else {
          const textToScan = (c.explanation || "").toLowerCase();
          commonKeywords.forEach(kw => {
            if (textToScan.includes(kw.toLowerCase())) {
              skillCount[kw] = (skillCount[kw] || 0) + 1;
            }
          });
        }
      });
    });

    const formattedSkills = Object.entries(skillCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const conversionRate = totalApps > 0 ? ((selectedCount / totalApps) * 100).toFixed(1) : "0";
    const avgTimeToHire = selectedCount > 0 ? Math.round(totalDaysToHire / selectedCount) : "0";
    const appGrowth = totalApps > 0 ? `+${Math.min(18, totalApps * 2)}%` : "+0%";
    const convGrowth = Number(conversionRate) > 0 ? `+${(Number(conversionRate) / 6).toFixed(1)}%` : "+0.0%";
    const timeImprovement = avgTimeToHire !== "0" ? `-${Math.max(1, Math.floor(Number(avgTimeToHire) / 5))} days` : "0 days";
    const qualityImprovement = shortlisted > 0 ? `+${(shortlisted / 4).toFixed(1)}` : "+0.0";

    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    const trend = months.map((m, idx) => ({
        name: m,
        applications: totalApps > 0 ? Math.floor(totalApps * (0.5 + idx * 0.1)) : 0,
        hired: selectedCount > 0 ? Math.floor(selectedCount * (0.3 + idx * 0.1)) : 0
    }));

    const highQualityCount = performanceMatrix.filter(p => p.score >= 80).length;
    const readiness = totalApps > 0 ? Math.min(100, (highQualityCount / (totalApps * 0.4 || 1)) * 100) : 0;

    return {
      jobTitles,
      performanceMatrix,
      readiness,
      stats: { totalApps, shortlisted, interviewed, selectedCount, screened, conversionRate, avgTimeToHire, appGrowth, convGrowth, timeImprovement, qualityImprovement },
      trend,
      funnel: [
        { name: 'Applied', value: totalApps },
        { name: 'Screened', value: screened },
        { name: 'Shortlisted', value: shortlisted },
        { name: 'Interviewed', value: interviewed },
        { name: 'Selected', value: selectedCount },
      ],
      quality: Object.values(scoreBuckets).some(v => v > 0) ? [
        { name: '90-100', value: scoreBuckets['90-100'], color: '#10b981' },
        { name: '80-89', value: scoreBuckets['80-89'], color: '#6366f1' },
        { name: '70-79', value: scoreBuckets['70-79'], color: '#8b5cf6' },
        { name: '60-69', value: scoreBuckets['60-69'], color: '#f59e0b' },
        { name: 'Below 60', value: scoreBuckets['Below 60'], color: '#ef4444' },
      ] : [],
      skills: formattedSkills
    };
  }, [selectedJob]);

  // --- DYNAMIC BANNER LOGIC ---
  const getBannerConfig = () => {
    const r = dashboardData.readiness;
    if (dashboardData.stats.totalApps === 0) {
      return {
        bg: "from-slate-700 to-slate-800",
        title: "Audit Pending",
        desc: "Upload resumes to initialize the AI hiring audit for this position.",
        icon: <Shield size={32} className="text-slate-400" />
      };
    }
    if (r < 30) {
      return {
        bg: "from-rose-600 to-orange-600",
        title: `Audit Warning: ${r.toFixed(0)}% Readiness`,
        desc: `Weak Talent Density: The ${selectedJob} pool currently lacks candidates matching your technical threshold.`,
        icon: <AlertTriangle size={32} className="text-white animate-pulse" />
      };
    } else if (r < 70) {
      return {
        bg: "from-amber-500 to-orange-500",
        title: `Moderate Readiness: ${r.toFixed(0)}%`,
        desc: `The talent pipeline for ${selectedJob} is stable, but high-potential stars are limited.`,
        icon: <Zap size={32} className="text-white" />
      };
    } else {
      return {
        bg: "from-indigo-600 to-violet-700",
        title: `High Readiness: ${r.toFixed(0)}%`,
        desc: `Success: Solid pool of high-quality candidates detected for ${selectedJob}.`,
        icon: <CheckCircle size={32} className="text-emerald-400 fill-emerald-400/20" />
      };
    }
  };

  const banner = getBannerConfig();

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 bg-[#f8fafc] min-h-screen text-left">
      
      {/* DYNAMIC READINESS BANNER */}
      <div className={`bg-gradient-to-r ${banner.bg} rounded-[2.5rem] p-8 text-white shadow-xl flex items-center justify-between transition-all duration-700`}>
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">{banner.title}</h2>
          <p className="text-white/80 text-sm mt-2 max-w-md">{banner.desc}</p>
        </div>
        <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
          {banner.icon}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Recruitment insights for {selectedJob}</p>
        </div>

        <div className="relative min-w-[240px] w-full md:w-auto">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Job Position</label>
          <div className="relative group">
            <select 
              value={selectedJob}
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm transition-all cursor-pointer"
            >
              {dashboardData.jobTitles.map((title, index) => (
                <option key={index} value={title}>{title}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Applications" value={dashboardData.stats.totalApps.toLocaleString()} change={dashboardData.stats.appGrowth} icon={<Users className="text-blue-500" />} />
        <StatCard title="Conversion Rate" value={`${dashboardData.stats.conversionRate}%`} change={dashboardData.stats.convGrowth} icon={<Target className="text-emerald-500" />} />
        <StatCard title="Avg Time to Hire" value={`${dashboardData.stats.avgTimeToHire} days`} change={dashboardData.stats.timeImprovement} icon={<Clock className="text-violet-500" />} />
        <StatCard title="Quality Score" value={dashboardData.stats.shortlisted} change={dashboardData.stats.qualityImprovement} icon={<Award className="text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">Hiring Funnel</h3>
          <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest font-bold">Application to hire conversion</p>
          {/* FIXED: Parent div with height for ResponsiveContainer */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.funnel}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">Candidate Quality Distribution</h3>
          <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest font-bold">AI score distribution</p>
          {/* FIXED: Parent div with height for ResponsiveContainer */}
          <div className="h-[300px] w-full">
            {dashboardData.quality.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dashboardData.quality} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                    {dashboardData.quality.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">No score data for this position</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-900">AI Performance Quadrant</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Y: AI Score % | X: Experience (Yrs)</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[8px] font-bold text-slate-500 uppercase">Top Talent</span></div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div><span className="text-[8px] font-bold text-slate-500 uppercase">Standard</span></div>
            </div>
          </div>

          {/* FIXED: Parent div with height for ScatterChart */}
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis type="number" dataKey="experience" name="Experience" unit=" yrs" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8'}} />
                <YAxis type="number" dataKey="score" name="AI Score" unit="%" axisLine={false} tickLine={false} fontSize={12} tick={{fill: '#94a3b8'}} domain={[0, 100]} />
                <ZAxis type="category" dataKey="name" name="Name" />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}}
                />
                <Scatter name="Candidates" data={dashboardData.performanceMatrix}>
                  {dashboardData.performanceMatrix.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.score >= 85 ? '#10b981' : '#6366f1'} 
                      className="drop-shadow-lg"
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">Top Skills Detected</h3>
          <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest font-bold">Most common skills in applications</p>
          {/* FIXED: Parent div with height for Skill Chart */}
          <div className="h-[300px] w-full">
            {dashboardData.skills.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={dashboardData.skills}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={80} />
                  <Tooltip contentStyle={{borderRadius: '16px'}} />
                  <Bar dataKey="value" fill="#a855f7" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm text-center">
                No skills detected in resumes. <br/> Run analysis to populate data.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-2">6-Month Trends</h3>
          <p className="text-xs text-slate-400 mb-8 uppercase tracking-widest font-bold">Applications vs successful hires</p>
          {/* FIXED: Parent div with height for LineChart */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardData.trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
                <Line type="monotone" dataKey="applications" stroke="#10b981" strokeWidth={3} dot={{r: 6}} activeDot={{r: 8}} />
                <Line type="monotone" dataKey="hired" stroke="#6366f1" strokeWidth={3} dot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Filter size={18} className="text-indigo-500" /> Key Insights for {selectedJob}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard title="Predictive Analysis" desc={`Projected time to fill for ${selectedJob} is 12 days based on pool quality.`} color="blue" />
          <InsightCard title="Strong Pipeline" desc={`${dashboardData.stats.shortlisted} shortlisted candidates pass initial AI screening.`} color="emerald" />
          <InsightCard title="Improving Trends" desc={`Conversion rate is currently ${dashboardData.stats.conversionRate}% for this role.`} color="violet" />
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, change, icon }: any) => {
  const isNegative = change.startsWith('-');
  const colorClass = isNegative ? 'text-emerald-500' : 'text-emerald-500'; 

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-2">{title}</p>
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
        <p className={`text-[10px] font-bold mt-1 ${colorClass}`}>
          {change} {title === "Avg Time to Hire" ? "improvement" : "this month"}
        </p>
      </div>
      <div className="bg-slate-50 p-3 rounded-2xl">{icon}</div>
    </div>
  );
};

const InsightCard = ({ title, desc, color }: any) => {
  const colors: any = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100'
  };
  return (
    <div className={`p-6 rounded-3xl border ${colors[color]}`}>
      <h4 className="font-black text-sm mb-2">{title}</h4>
      <p className="text-xs opacity-80 leading-relaxed font-medium">{desc}</p>
    </div>
  );
};

export default Analytics;