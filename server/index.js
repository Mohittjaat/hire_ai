const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const mammoth = require("mammoth");
const PDFParser = require("pdf2json");
const cors = require('cors');
const nodemailer = require('nodemailer'); // Added for email support
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || process.env.GEMINI_API_KEY);

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS, // Your App Password
    },
});

// --- ROUTE: TECHNICAL BATTLE ANALYSIS (PRO vs CON) ---
// MERGED & REPLACED: Enforces explicit tokenized delimiters to stop the AI from swapping candidate identities.
app.post('/battle-compare', async (req, res) => {
    console.log("⚔️ Request Received: Generating Technical Battle Analysis...");
    
    try {
        const { candidateA, candidateB, jobDescription } = req.body;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Act as a Senior Technical Recruiter and Pipeline Auditor. 
            Compare these two candidates strictly against the Job Description.
            
            JOB DESCRIPTION: ${jobDescription}

            CANDIDATE A:
            Name: ${candidateA.name}
            Experience: ${candidateA.yearsOfExperience} years
            Technical Reasoning: ${candidateA.explanation}

            CANDIDATE B:
            Name: ${candidateB.name}
            Experience: ${candidateB.yearsOfExperience} years
            Technical Reasoning: ${candidateB.explanation}

            Generate a side-by-side technical gap analysis.
            
            CRITICAL RULES FOR STRING TOKENIZATION:
            1. For "candidateA.edge", explain why Candidate A has a technical advantage. Use the exact template token "{{NAME_A}}" instead of their real name.
            2. For "candidateB.edge", explain why Candidate B has a technical advantage. Use the exact template token "{{NAME_B}}" instead of their real name.
            3. For the "verdict", write a 2-3 sentence technical recommendation. Use the exact token "{{NAME_A}}" when referring to Candidate A and "{{NAME_B}}" when referring to Candidate B. Do not use their raw string names here.

            Return ONLY a clean JSON object with this exact structure:
            {
                "candidateA": {
                    "pros": ["Point 1", "Point 2"],
                    "cons": ["Point 1", "Point 2"],
                    "edge": "One sentence explaining why {{NAME_A}} holds a specific technical advantage."
                },
                "candidateB": {
                    "pros": ["Point 1", "Point 2"],
                    "cons": ["Point 1", "Point 2"],
                    "edge": "One sentence explaining why {{NAME_B}} holds a specific technical advantage."
                },
                "verdict": "Write the final technical hiring verdict using the tokens {{NAME_A}} and {{NAME_B}} to identify the candidates dynamically."
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

// --- UPGRADED ROUTE 1: RESUME ANALYSIS (HIGHLY GRANULAR AND STRUCTURED PRESTIGE LOG UPGRADE) ---
app.post('/analyze', upload.single('resume'), async (req, res) => {
    console.log("📥 Request Received: Analyzing Resume with Advanced Technical Pillars...");
    
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

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const prompt = `
        You are an expert Enterprise Technical Recruiter and AI Pipeline Auditor. 
        Analyze the following candidate resume text strictly against the provided Job Description.

        Job Title: ${jobTitle}
        Job Description: ${jobDescription}
        Candidate Resume: ${resumeText}

        You must return a clean, valid JSON object with NO markdown formatting, NO backticks (\`\`\`), and NO wrap. Use this exact schema:

        {
          "name": "Extract candidate name",
          "email": "Extract candidate email",
          "fairScore": "Integer (0-100). Rate STRICTLY on core tech stack, architectures, matching framework skills, and code projects. Deduct heavily if key stack requirements are missing.",
          "biasScore": "Integer (0-100). Calculate by taking the fairScore and adding prestige weights: Add +10 to +15 points if the candidate is from a Tier-1 college (IIT, NIT, BITS) or Fortune 500 company. If no brand markers exist, biasScore must equal fairScore.",
          "yearsOfExperience": "Integer representing length of professional tenure",
          "explanation": "Provide a hard, mathematical verification sentence summarizing the match status.",
          "reasoning": {
            "fair": "TECHNICAL SKILLS AUDIT BREAKDOWN:\n- Core Stack Match: Explicitly list which matching technologies were found.\n- Project Depth: Evaluate the complexity of the listed technical projects.\n- Missing Requirements: List exactly what skills from the job description are missing from the resume.",
            "bias": "PRESTIGE BIAS METRICS LOG:\n- Prestige Triggers Detected: Identify specific brand names (e.g., IIT Dhanbad, Tier-1 status) that altered the score.\n- Weighting Impact: Detail exactly how many arbitrary 'prestige points' were added to the profile to expose the brand bias deviation."
          },
          "details": {
            "skills": ["Array", "of", "top", "3-5", "technical", "skills", "found"],
            "college": "Name of college extracted",
            "company": "Detected Companies"
          }
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

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

        console.log("✅ Advanced Pillar Analysis Complete:", finalData.name);
        res.json(finalData);

    } catch (error) {
        console.error("🔥 Analysis Error:", error);
        res.status(500).json({ error: "AI Analysis failed." });
    }
});

// --- ROUTE 2: GENERATE INTERVIEW QUESTIONS ---
app.post('/generate-interview', async (req, res) => {
    try {
        const { jobRole, jobDesc, yearsOfExp, type, resumeText, questionCount } = req.body;

        const schema = {
            description: "List of interview questions",
            type: SchemaType.OBJECT,
            properties: {
                questions: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                },
            },
            required: ["questions"],
        };

        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7,
            },
        });

        const prompt = `Generate exactly ${questionCount} ${type} interview questions for Role: ${jobRole}. Base questions on Job Description: ${jobDesc} and Resume context: ${resumeText}.`;

        const result = await model.generateContent(prompt);
        const content = result.response.text();
        res.json({ success: true, questions: JSON.parse(content).questions });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// --- ROUTE 3: EVALUATE TRANSCRIPT ---
app.post('/evaluate-transcript', async (req, res) => {
    console.log("📝 Request Received: Evaluating Vapi Interview Transcript via Gemini...");
    try {
        const { transcript } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: "No transcript received from voice session." });
        }

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
            required: [
                "totalScore", "overallFeedback", "strengths", "improvements",
                "communicationScore", "technicalScore", "problemSolvingScore", "fitScore", "confidenceScore"
            ],
        };

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.4,
            },
        });

        const prompt = `
          You are an expert technical interviewer evaluating an applicant's conversational transcript. 
          Analyze the following verbal exchange and map performance attributes into the required schema context.
          
          Transcript history log:
          ${JSON.stringify(transcript)}
        `;

        const result = await model.generateContent(prompt);
        res.json({ success: true, evaluation: JSON.parse(result.response.text()) });
    } catch (error) {
        console.error("🔥 Technical Evaluation failed:", error);
        res.status(500).json({ success: false, error: "AI Evaluation pipeline failed." });
    }
});

// --- ROUTE 4: SEND EMAIL INVITE ---
app.post('/send-invite', async (req, res) => {
    console.log("📧 Request Received: Sending Email Invite...");
    const { candidateEmail, candidateName, jobTitle } = req.body;

    if (!candidateEmail || candidateEmail === "N/A") {
        return res.status(400).json({ success: false, error: "Valid email not found in resume analysis." });
    }

    const interviewLink = `http://localhost:5173/login?email=${encodeURIComponent(candidateEmail)}`;  

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
                    <p>We are pleased to inform you that you have been shortlisted for the <b>${jobTitle}</b> position.</p>
                    <p>As the next step, we would like you to participate in an AI-powered voice interview. Our virtual recruiter is ready to chat with you!</p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${interviewLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Enter Interview Room</a>
                    </div>
                    <p>Good luck!</p>
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                    <p style="font-size: 12px; color: #64748b;">If the button above doesn't work, copy and paste this link into your browser:<br>${interviewLink}</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`./ Email sent successfully to ${candidateEmail}`);
        res.json({ success: true, message: "Invite delivered." });
    } catch (error) {
        console.error("🔥 Email Error:", error);
        res.status(500).json({ success: false, error: "Failed to deliver email." });
    }
});

const PORT = process.env.PORT || 5000;

transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Email Configuration Error:", error);
  } else {
    console.log("✅ Server is ready to send emails!");
  }
});

app.use((err, req, res, next) => {
    console.error("Unhandled express exception thrown:", err);
    res.status(500).json({ error: "Internal Server Fault Error" });
});

// Add this temporary line right above app.listen to check server health:
app.get('/health', (req, res) => res.json({ status: "alive", message: "Backend is fully unblocked!" }));

app.listen(PORT, () => console.log(`🚀 AI Analyzer running on http://localhost:${PORT}`));