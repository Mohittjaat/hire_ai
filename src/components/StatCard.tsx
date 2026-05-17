import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
}

const StatCard = ({ title, value, change, icon }: StatCardProps) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {change && (
          <p className="text-emerald-500 text-xs font-bold mt-2">
            {change}
          </p>
        )}
      </div>
      <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
        {icon}
      </div>
    </div>
  );
};

export default StatCard;