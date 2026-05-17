import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Candidates from "./pages/Candidates"; 
import BulkUpload from "./pages/BulkUpload"; 
import InterviewDashboard from "./pages/InterviewDashboard"; 
import InterviewRoom from "./pages/InterviewRoom";
import InterviewSetup from "./pages/InterviewSetup"; // ADDED: Import for the new setup page
import MainLayout from "./layouts/MainLayout"; 
import ProtectedRoute from "./components/ProtectedRoute"; // Import our merged gatekeeper
import Analytics from "./pages/Analytics";
import JobPostings from "./pages/JobPostings"; // ADDED: Import for the source of truth page

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. PUBLIC AUTH ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 2. CANDIDATE ACCESS (Email-verified, No Sidebar) */}
        {/* Added candidate-login to match the email link exactly */}
        <Route path="/interview" element={<InterviewRoom />} />
        <Route path="/candidate-login" element={<InterviewRoom />} />

        <Route path="/analytics" element={<ProtectedRoute><MainLayout><Analytics /></MainLayout></ProtectedRoute>} />

        {/* 3. PROTECTED HR ROUTES (Wrapped in Gatekeeper + Sidebar Layout) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/ai-reports" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <InterviewDashboard />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/candidates" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Candidates />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        {/* ADDED: Route for Job Postings */}
        <Route 
          path="/jobs" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <JobPostings />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <BulkUpload />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        {/* ADDED: Route for the Interview Configuration/Setup page */}
        <Route 
          path="/setup-interview" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <InterviewSetup />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        {/* 4. DEFAULT REDIRECT */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;