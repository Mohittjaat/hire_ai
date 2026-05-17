import React from 'react';
import Sidebar from '../components/Sidebar';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* 1. Permanent Sidebar */}
      <Sidebar />

      {/* 2. Dynamic Content Area */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;