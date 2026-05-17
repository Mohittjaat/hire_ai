const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Prisma with the direct URL for Prisma 7 compatibility
const prisma = new PrismaClient({
  datasourceUrl: process.env.MONGODB_URI,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST: Create Feedback & Pass/Fail Decision
router.post('/feedback', async (req, res) => {
  const { interviewId, transcript } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const transcriptText = transcript
      .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`)
      .join("\n\n");

    const prompt = `
      System: You are an expert HR Panel. Analyze this interview transcript:
      ${transcriptText}
      
      Provide a detailed evaluation in JSON format:
      { 
        "totalScore": number (0-100), 
        "overallFeedback": string, 
        "hiringDecision": "SELECTED" | "REJECTED" | "FOLLOW_UP",
        "communicationScore": number, 
        "technicalScore": number, 
        "problemSolvingScore": number, 
        "fitScore": number, 
        "confidenceScore": number,
        "strengths": string[], 
        "improvements": string[] 
      }
    `;

    const result = await model.generateContent(prompt);
    const evaluation = JSON.parse(result.response.text());

    // Save to MongoDB using the feedback relation
    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        finalized: true,
        feedback: {
          create: {
            totalScore: evaluation.totalScore,
            feedback: evaluation.overallFeedback,
            decision: evaluation.hiringDecision, // Pass/Fail logic
            communicationScore: evaluation.communicationScore,
            technicalScore: evaluation.technicalScore,
            problemSolvingScore: evaluation.problemSolvingScore,
            fitScore: evaluation.fitScore,
            confidenceScore: evaluation.confidenceScore,
            strengths: { set: evaluation.strengths },
            improvements: { set: evaluation.improvements },
          }
        }
      }
    });

    res.json({ success: true, decision: evaluation.hiringDecision });
  } catch (error) {
    console.error("Feedback Error:", error);
    res.status(500).json({ error: "Failed to process interview feedback" });
  }
});

module.exports = router;