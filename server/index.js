const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const mammoth = require("mammoth");
const PDFParser = require("pdf2json");
const cors = require('cors');
const nodemailer = require('nodemailer');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || process.env.GEMINI_API_KEY);

// --- MONGODB CONNECTION ---
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI);

async function connectDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db("hireai");
    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
  }
}
connectDB();

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ═══════════════════════════════════════════════════════════════
// ─── AUTH ROUTES ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// POST /api/auth/register — Save new HR account to MongoDB
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, company, email, password } = req.body;
    const emailKey = email.trim().toLowerCase();

    const existing = await db.collection("hr_users").findOne({ email: emailKey });
    if (existing) {
      return res.status(400).json({ success: false, error: "Account already exists with this email." });
    }

    await db.collection("hr_users").insertOne({
      fullName,
      company,
      email: emailKey,
      password,
      createdAt: new Date()
    });

    res.json({ success: true, user: { fullName, company, email: emailKey } });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ success: false, error: "Registration failed." });
  }
});

// POST /api/auth/login — Verify HR credentials from MongoDB
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailKey = email.trim().toLowerCase();

    const user = await db.collection("hr_users").findOne({ email: emailKey });
    if (!user) {
      return res.status(404).json({ success: false, error: "No account found with this email." });
    }
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: "Invalid password." });
    }

    res.json({
      success: true,
      user: { fullName: user.fullName, company: user.company, email: user.email }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ success: false, error: "Login failed." });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── JOBS ROUTES ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// GET /api/jobs — Get all jobs for this HR
app.get('/api/jobs', async (req, res) => {
  try {
    const hrEmail = req.headers['hr-email'];
    if (!hrEmail) return res.status(400).json({ success: false, error: "HR email required." });

    const jobs = await db.collection("jobs").find({ hrEmail }).toArray();
    res.json({ success: true, jobs });
  } catch (err) {
    console.error("Get Jobs Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch jobs." });
  }
});

// POST /api/jobs — Create a new job
app.post('/api/jobs', async (req, res) => {
  try {
    const { hrEmail, job } = req.body;
    const newJob = { ...job, hrEmail, createdAt: new Date() };
    const result = await db.collection("jobs").insertOne(newJob);
    res.json({ success: true, jobId: result.insertedId, job: { ...newJob, _id: result.insertedId } });
  } catch (err) {
    console.error("Create Job Error:", err);
    res.status(500).json({ success: false, error: "Failed to create job." });
  }
});

// PUT /api/jobs/:id — Update a job (candidates, config, etc.)
app.put('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { updates } = req.body;
    await db.collection("jobs").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Update Job Error:", err);
    res.status(500).json({ success: false, error: "Failed to update job." });
  }
});

// DELETE /api/jobs/:id — Delete a job
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("jobs").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Job Error:", err);
    res.status(500).json({ success: false, error: "Failed to delete job." });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── INTERVIEW RULES ROUTES ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// POST /api/interview-rules — Save interview setup rules
app.post('/api/interview-rules', async (req, res) => {
  try {
    const { hrEmail, rules } = req.body;
    await db.collection("interview_rules").updateOne(
      { hrEmail },
      { $set: { hrEmail, rules, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Save Rules Error:", err);
    res.status(500).json({ success: false, error: "Failed to save rules." });
  }
});

// GET /api/interview-rules — Get active interview rules for HR
app.get('/api/interview-rules', async (req, res) => {
  try {
    const hrEmail = req.headers['hr-email'];
    const rulesDoc = await db.collection("interview_rules").findOne({ hrEmail });
    res.json({ success: true, rules: rulesDoc?.rules || null });
  } catch (err) {
    console.error("Get Rules Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch rules." });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── INTERVIEW REPORTS ROUTES ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// POST /api/reports — Save interview report
app.post('/api/reports', async (req, res) => {
  try {
    const { hrEmail, report } = req.body;
    const newReport = { ...report, hrEmail, createdAt: new Date() };
    const result = await db.collection("interview_reports").insertOne(newReport);
    res.json({ success: true, reportId: result.insertedId });
  } catch (err) {
    console.error("Save Report Error:", err);
    res.status(500).json({ success: false, error: "Failed to save report." });
  }
});

// GET /api/reports — Get all reports for this HR
app.get('/api/reports', async (req, res) => {
  try {
    const hrEmail = req.headers['hr-email'];
    const reports = await db.collection("interview_reports")
      .find({ hrEmail })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, reports });
  } catch (err) {
    console.error("Get Reports Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch reports." });
  }
});

// DELETE /api/reports/:id — Delete a report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("interview_reports").deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete Report Error:", err);
    res.status(500).json({ success: false, error: "Failed to delete report." });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── CANDIDATE ROUTES ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// GET /api/candidates/verify — Verify if candidate is shortlisted
app.get('/api/candidates/verify', async (req, res) => {
  try {
    const { email } = req.query;
    const candidateEmail = email.trim().toLowerCase();

    // Search across all jobs for this candidate
    const job = await db.collection("jobs").findOne({
      "candidates.email": candidateEmail,
      "candidates.status": "Shortlisted"
    });

    if (job) {
      const candidate = job.candidates.find(
        c => c.email?.trim().toLowerCase() === candidateEmail && c.status === "Shortlisted"
      );
      return res.json({ success: true, found: true, candidate: { ...candidate, jobTitle: job.title } });
    }

    res.json({ success: true, found: false });
  } catch (err) {
    console.error("Verify Candidate Error:", err);
    res.status(500).json({ success: false, error: "Verification failed." });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── EXISTING ROUTES (UNCHANGED) ────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// --- ROUTE: TECHNICAL BATTLE ANALYSIS ---
app.post('/battle-compare', async (req, res) => {
  console.log("⚔️ Request Received: Generating Technical Battle Analysis...");
  try {
    const { candidateA, candidateB, jobDescription } = req.body;
    const model = genAI.getGenerativeModel({
     model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });
    const prompt = `
      Act as a Senior Technical Recruiter and Pipeline Auditor. 
      Compare these two candidates strictly against the Job Description.
      
      JOB DESCRIPTION: ${jobDescription}
      CANDIDATE A: Name: ${candidateA.name}, Experience: ${candidateA.yearsOfExperience} years, Technical Reasoning: ${candidateA.explanation}
      CANDIDATE B: Name: ${candidateB.name}, Experience: ${candidateB.yearsOfExperience} years, Technical Reasoning: ${candidateB.explanation}

      Generate a side-by-side technical gap analysis.
      
      CRITICAL RULES FOR STRING TOKENIZATION:
      1. For "candidateA.edge", use the exact template token "{{NAME_A}}" instead of their real name.
      2. For "candidateB.edge", use the exact template token "{{NAME_B}}" instead of their real name.
      3. For the "verdict", use "{{NAME_A}}" and "{{NAME_B}}" tokens.

      Return ONLY a clean JSON object:
      {
        "candidateA": { "pros": ["Point 1", "Point 2"], "cons": ["Point 1", "Point 2"], "edge": "One sentence using {{NAME_A}}." },
        "candidateB": { "pros": ["Point 1", "Point 2"], "cons": ["Point 1", "Point 2"], "edge": "One sentence using {{NAME_B}}." },
        "verdict": "Final verdict using {{NAME_A}} and {{NAME_B}}."
      }
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    res.json(JSON.parse(responseText));
  } catch (error) {
    console.error("🔥 Battle Error:", error);
    res.status(500).json({ error: "Comparison failed." });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── VECTOR EMBEDDING + COSINE SIMILARITY ANALYSIS ──────────────
// ═══════════════════════════════════════════════════════════════

// ─── HELPER: Calculate Cosine Similarity between two vectors ────
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// ─── HELPER: Get embedding vector from Google API ───────────────
async function getEmbedding(text, apiKey) {
  console.log("📏 Embedding text length:", text?.length, "| Preview:", text?.substring(0, 80));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: {
          parts: [{ text: text.substring(0, 8000) }]
        }
      })
    }
  );
  const data = await response.json();
  return data.embedding?.values || [];
}

// ─── ROUTE: VECTOR EMBEDDING RESUME ANALYSIS ────────────────────
app.post('/embed-analyze', upload.single('resume'), async (req, res) => {
  console.log("🧠 Vector Embedding Analysis Started...");

  try {
    const { jobDescription, jobTitle, manualName, manualEmail } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Step 1: Extract text from resume
    let resumeText = "";
    if (req.file.mimetype === "application/pdf") {
      const pdfParser = new PDFParser(null, 1);
      resumeText = await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", err => reject(err));
        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
        pdfParser.parseBuffer(req.file.buffer);
      });
    } else if (req.file.originalname.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      resumeText = result.value;
    } else {
      return res.status(400).json({ error: "Please upload PDF or DOCX." });
    }

    const GEMINI_KEY = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;

    // Step 2: Get embedding vectors for both resume and job description
    console.log("📐 Generating embedding vectors...");
    const [resumeVector, jobVector] = await Promise.all([
      getEmbedding(resumeText, GEMINI_KEY),
      getEmbedding(jobDescription, GEMINI_KEY)
    ]);

    // Step 3: Calculate cosine similarity score (0 to 1)
    const similarity = cosineSimilarity(resumeVector, jobVector);

    // Step 4 & 5: Apply dynamic scaling mapping to turn decimal index into stable 0-100 integers
    let fairScore;
    if (similarity >= 0.80) fairScore = Math.round(85 + (similarity - 0.80) * 75);
    else if (similarity >= 0.65) fairScore = Math.round(65 + (similarity - 0.65) * 133);
    else if (similarity >= 0.50) fairScore = Math.round(40 + (similarity - 0.50) * 167);
    else fairScore = Math.round(similarity * 80);
    fairScore = Math.min(100, Math.max(0, fairScore));

    // Step 6: Get structural parsing data from Gemini (safely excluding score generation)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const infoPrompt = `
      Extract candidate info from this resume. Return ONLY clean JSON, no markdown:
      Resume: ${resumeText.substring(0, 3000)}
      Job Title: ${jobTitle}
      
      {
        "name": "candidate full name or null",
        "email": "candidate email or null",
        "yearsOfExperience": 0,
        "explanation": "One sentence: how well this resume matches ${jobTitle} role based on skills found",
        "reasoning": {
          "fair": "List 3 matching technical skills found in resume vs job requirements",
          "bias": "List 2 missing skills or gaps compared to job requirements"
        },
        "details": {
          "skills": ["top 5 technical skills found"],
          "college": "college name or null",
          "company": "company names or null"
        }
      }
    `;

    const result = await model.generateContent(infoPrompt);
    let infoText = result.response.text().replace(/```json|```/g, "").trim();
    const info = JSON.parse(infoText);

    // Step 7: Calculate prestige bias weighting metrics (multi-factor dynamic scoring)
    let biasScore = fairScore;
    const resumeLower = resumeText.toLowerCase();
    const jobDescLower = (jobDescription || '').toLowerCase();

    // Tier 1: Top institutions — whole word match only (+12 each)
    const tier1colleges = ['IIT', 'BITS', 'NIT'];
    const tier1found = tier1colleges.filter(k =>
      new RegExp(`\\b${k.toLowerCase()}\\b`).test(resumeLower)
    );

    // Tier 2: Top tech companies — whole word match only (+10 each)
    const tier2companies = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix', 'uber', 'adobe', 'flipkart', 'infosys', 'tcs', 'wipro'];
    const tier2found = tier2companies.filter(k =>
      new RegExp(`\\b${k}\\b`).test(resumeLower)
    );

    // Tier 3: Hands-on internship in a domain relevant to the job (+7)
    const internshipKeywords = ['internship', 'intern', 'trainee', 'apprentice'];
    const hasInternship = internshipKeywords.some(k => resumeLower.includes(k));
    const technicalDomains = ['software', 'developer', 'engineer', 'data', 'machine learning', 'backend', 'frontend', 'fullstack', 'full stack', 'devops', 'cloud', 'ai', 'ml'];
    const relevantInternship = hasInternship && technicalDomains.some(domain =>
      jobDescLower.includes(domain) || resumeLower.includes(domain)
    );

    // Tier 4: Skill overlap bonus — count how many job description keywords appear in resume (+2 each, max +10)
    const jobWords = jobDescLower.split(/\s+/).filter(w => w.length > 3);
    const uniqueJobWords = [...new Set(jobWords)];
    const skillOverlapCount = uniqueJobWords.filter(w => resumeLower.includes(w)).length;
    const skillOverlapBoost = Math.min(skillOverlapCount * 2, 10);

    // Tier 5: Certifications boost (+3 each, max +6)
    const certKeywords = ['certified', 'certification', 'oracle', 'aws certified', 'google certified', 'microsoft certified', 'nptel', 'coursera', 'udemy'];
    const certsFound = certKeywords.filter(k => resumeLower.includes(k));
    const certBoost = Math.min(certsFound.length * 3, 6);

    // Tier 6: Project depth signal — more projects = more hands-on experience (+3 to +5)
    const projectMatches = (resumeText.match(/project/gi) || []).length;
    const projectBoost = projectMatches >= 4 ? 5 : projectMatches >= 2 ? 3 : 0;

    // Tier 7: GitHub / portfolio presence signals real work (+3)
    const portfolioBoost = (resumeLower.includes('github') || resumeLower.includes('portfolio') || resumeLower.includes('linkedin')) ? 3 : 0;

    // Calculate total bias boost from all tiers
    // Calculate total bias boost from all tiers
    let totalBiasBoost = 0;
    totalBiasBoost += tier1found.length * 12;
    totalBiasBoost += tier2found.length * 10;
    totalBiasBoost += relevantInternship ? 7 : 0;
    totalBiasBoost += skillOverlapBoost;
    totalBiasBoost += certBoost;
    totalBiasBoost += projectBoost;
    totalBiasBoost += portfolioBoost;

    // Small random noise (±3) so similar profiles never show identical scores
    const randomNoise = Math.floor(Math.random() * 7) - 3;
    totalBiasBoost = Math.max(0, totalBiasBoost + randomNoise);

    // Cap bias score at 96 max so no one ever hits 100%
    // IIT candidates get priority ceiling of 96, non-IIT capped at 89
    const hasIIT = tier1found.some(k => k.toLowerCase() === 'iit');
    const biasCeiling = hasIIT ? 96 : 89;
    biasScore = Math.min(biasCeiling, fairScore + totalBiasBoost);

    // IIT guarantee: if candidate has IIT tag, their bias score must always be
    // at least 5 points above any non-IIT candidate with same fair score
    if (hasIIT && biasScore < fairScore + 5) {
      biasScore = Math.min(biasCeiling, fairScore + 5);
    }

    console.log(`🎯 Bias breakdown — Tier1colleges: [${tier1found}] | hasIIT: ${hasIIT} | Companies: [${tier2found}] | Internship: ${relevantInternship} | SkillOverlap: +${skillOverlapBoost} | Certs: ${certsFound.length} | Projects: +${projectBoost} | Portfolio: +${portfolioBoost} | Noise: ${randomNoise} | Ceiling: ${biasCeiling} → Total boost: +${totalBiasBoost} → BiasScore: ${biasScore}%`);

    // Step 8: Build final unified data block mapped explicitly to calculated numbers
    const finalData = {
      name: (info.name && !info.name.includes("null")) ? info.name : manualName,
      email: (info.email && !info.email.includes("null")) ? info.email.trim() : manualEmail,
      yearsOfExperience: info.yearsOfExperience || 0,

      // ✅ FIXED: Enforced calculated mathematical variables into core outputs
      fairScore: fairScore,
      biasScore: biasScore,
      score: fairScore,

      vectorSimilarity: parseFloat(similarity.toFixed(4)),
      scoringMethod: "Vector Embedding Cosine Similarity",

      explanation: info.explanation || `Vector similarity match: ${(similarity * 100).toFixed(1)}% alignment with job requirements.`,
      reasoning: {
        fair: info.reasoning?.fair || "Skills analysis complete.",
        bias: info.reasoning?.bias || "No bias deviation detected."
      },
      details: {
        skills: info.details?.skills || [],
        college: info.details?.college || "Not specified",
        company: info.details?.company || "Not specified"
      }
    };

    console.log(`✅ Vector Analysis Mapped: ${finalData.name} | Vector Similarity: ${similarity.toFixed(4)} | True Score Assigned: ${fairScore}% | Bias Score: ${biasScore}%`);
    res.json(finalData);

  } catch (error) {
    console.error("🔥 Vector Embedding Error:", error);
    res.status(500).json({ error: "Vector analysis failed. Try /analyze endpoint." });
  }
});

// --- ROUTE: RESUME ANALYSIS (LEGACY PROMPT SCORING) ---
app.post('/analyze', upload.single('resume'), async (req, res) => {
  console.log("📥 Request Received: Analyzing Resume...");
  try {
    const { jobDescription, jobTitle, manualName, manualEmail } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    let resumeText = "";
    if (req.file.mimetype === "application/pdf") {
      const pdfParser = new PDFParser(null, 1);
      resumeText = await new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", err => reject(err));
        pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
        pdfParser.parseBuffer(req.file.buffer);
      });
    } else if (req.file.originalname.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      resumeText = result.value;
    } else {
      return res.status(400).json({ error: "Please upload PDF or DOCX." });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an expert Enterprise Technical Recruiter and AI Pipeline Auditor. 
      Analyze the following candidate resume text strictly against the provided Job Description.

      Job Title: ${jobTitle}
      Job Description: ${jobDescription}
      Candidate Resume: ${resumeText}

      Return a clean, valid JSON object with NO markdown:
      {
        "name": "Extract candidate name",
        "email": "Extract candidate email",
        "fairScore": "Integer (0-100). Rate STRICTLY on core tech stack match.",
        "biasScore": "Integer (0-100). Add prestige weights for Tier-1 colleges/companies.",
        "yearsOfExperience": "Integer representing professional tenure",
        "explanation": "Hard mathematical verification sentence summarizing match.",
        "reasoning": {
          "fair": "TECHNICAL SKILLS AUDIT BREAKDOWN with core stack match, project depth, missing requirements.",
          "bias": "PRESTIGE BIAS METRICS LOG with prestige triggers and weighting impact."
        },
        "details": {
          "skills": ["Array", "of", "top", "3-5", "technical", "skills"],
          "college": "Name of college extracted",
          "company": "Detected Companies"
        }
      }
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysis = JSON.parse(cleanJson);

    const finalData = {
      ...analysis,
      name: (analysis.name === "Candidate Full Name" || !analysis.name || analysis.name.includes("Extract")) ? manualName : analysis.name,
      email: (analysis.email === "Candidate Email" || !analysis.email || analysis.email.includes("Extract")) ? manualEmail : analysis.email,
      explanation: analysis.explanation || "Verification Complete.",
      reasoning: {
        fair: analysis.reasoning?.fair || "Standard evaluation recorded.",
        bias: analysis.reasoning?.bias || "No deviation logged."
      }
    };

    console.log("✅ Analysis Complete:", finalData.name);
    res.json(finalData);
  } catch (error) {
    console.error("🔥 Analysis Error:", error);
    res.status(500).json({ error: "AI Analysis failed." });
  }
});

// --- ROUTE: GENERATE INTERVIEW QUESTIONS ---
app.post('/generate-interview', async (req, res) => {
  try {
    const { jobRole, jobDesc, yearsOfExp, type, resumeText, questionCount } = req.body;
    const schema = {
      description: "List of interview questions",
      type: SchemaType.OBJECT,
      properties: {
        questions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ["questions"],
    };
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 },
    });
    const prompt = `Generate exactly ${questionCount} ${type} interview questions for Role: ${jobRole}. Base questions on Job Description: ${jobDesc} and Resume context: ${resumeText}.`;
    const result = await model.generateContent(prompt);
    const content = result.response.text();
    res.json({ success: true, questions: JSON.parse(content).questions });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// --- ROUTE: EVALUATE TRANSCRIPT ---
app.post('/evaluate-transcript', async (req, res) => {
  console.log("📝 Request Received: Evaluating Interview Transcript...");
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: "No transcript received." });

    const schema = {
      description: "Evaluation of interview performance",
      type: SchemaType.OBJECT,
      properties: {
        totalScore: { type: SchemaType.NUMBER },
        overallFeedback: { type: SchemaType.STRING },
        communicationScore: { type: SchemaType.NUMBER },
        technicalScore: { type: SchemaType.NUMBER },
        problemSolvingScore: { type: SchemaType.NUMBER },
        fitScore: { type: SchemaType.NUMBER },
        confidenceScore: { type: SchemaType.NUMBER },
        strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        improvements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      },
      required: ["totalScore", "overallFeedback", "strengths", "improvements", "communicationScore", "technicalScore", "problemSolvingScore", "fitScore", "confidenceScore"],
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.4 },
    });

    const prompt = `
      You are an expert technical interviewer evaluating an applicant's conversational transcript. 
      Analyze the following verbal exchange and map performance attributes into the required schema.
      Transcript: ${JSON.stringify(transcript)}
    `;

    const result = await model.generateContent(prompt);
    res.json({ success: true, evaluation: JSON.parse(result.response.text()) });
  } catch (error) {
    console.error("🔥 Evaluation Error:", error);
    res.status(500).json({ success: false, error: "AI Evaluation failed." });
  }
});

// --- ROUTE: SEND EMAIL INVITE ---
app.post('/send-invite', async (req, res) => {
  console.log("📧 Request Received: Sending Email Invite...");
  const { candidateEmail, candidateName, jobTitle } = req.body;

  if (!candidateEmail || candidateEmail === "N/A") {
    return res.status(400).json({ success: false, error: "Valid email not found." });
  }

  const interviewLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?email=${encodeURIComponent(candidateEmail)}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: candidateEmail,
    subject: `Interview Invitation: ${jobTitle} Role`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center; color: white;">
          <h1>Congratulations!</h1>
        </div>
        <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
          <p>Hello <b>${candidateName}</b>,</p>
          <p>You have been shortlisted for the <b>${jobTitle}</b> position.</p>
          <p>Please participate in an AI-powered voice interview at your earliest convenience.</p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${interviewLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Enter Interview Room</a>
          </div>
          <p>Good luck!</p>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p style="font-size: 12px; color: #64748b;">If button doesn't work, copy this link:<br>${interviewLink}</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${candidateEmail}`);
    res.json({ success: true, message: "Invite delivered." });
  } catch (error) {
    console.error("🔥 Email Error:", error);
    res.status(500).json({ success: false, error: "Failed to deliver email." });
  }
});

// --- HEALTH CHECK ---
app.get('/health', (req, res) => res.json({ status: "alive", message: "Backend is fully operational!" }));

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("Unhandled exception:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Email Configuration Error:", error);
  } else {
    console.log("✅ Server is ready to send emails!");
  }
});

app.listen(PORT, () => console.log(`🚀 AI Analyzer running on http://localhost:${PORT}`));