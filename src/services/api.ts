// ─── Central API Service ─────────────────────────────────────────────────────
// All backend calls go through here instead of localStorage

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to get current HR email for requests
const getHREmail = (): string => {
  return localStorage.getItem("currentHREmail") || "";
};

// Helper for fetch with HR email header
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "hr-email": getHREmail(),
      ...options.headers,
    },
  });
  return response.json();
};

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const registerHR = async (formData: {
  fullName: string;
  company: string;
  email: string;
  password: string;
}) => {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(formData),
  });
};

export const loginHR = async (email: string, password: string) => {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
};

// ─── JOBS ────────────────────────────────────────────────────────────────────

export const getJobs = async () => {
  return apiFetch("/api/jobs");
};

export const createJob = async (job: any) => {
  return apiFetch("/api/jobs", {
    method: "POST",
    body: JSON.stringify({ hrEmail: getHREmail(), job }),
  });
};

export const updateJob = async (id: string, updates: any) => {
  return apiFetch(`/api/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify({ updates }),
  });
};

export const deleteJob = async (id: string) => {
  return apiFetch(`/api/jobs/${id}`, {
    method: "DELETE",
  });
};

// ─── INTERVIEW RULES ─────────────────────────────────────────────────────────

export const saveInterviewRules = async (rules: any) => {
  return apiFetch("/api/interview-rules", {
    method: "POST",
    body: JSON.stringify({ hrEmail: getHREmail(), rules }),
  });
};

export const getInterviewRules = async () => {
  return apiFetch("/api/interview-rules");
};

// ─── INTERVIEW REPORTS ───────────────────────────────────────────────────────

export const saveReport = async (report: any) => {
  return apiFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify({ hrEmail: getHREmail(), report }),
  });
};

export const getReports = async () => {
  return apiFetch("/api/reports");
};

export const deleteReport = async (id: string) => {
  return apiFetch(`/api/reports/${id}`, {
    method: "DELETE",
  });
};

// ─── CANDIDATES ──────────────────────────────────────────────────────────────

export const verifyCandidate = async (email: string) => {
  return apiFetch(`/api/candidates/verify?email=${encodeURIComponent(email)}`);
};

// ─── LEGACY (kept for backward compatibility) ────────────────────────────────
export const api = {
  login: () => Promise.resolve(true),
};