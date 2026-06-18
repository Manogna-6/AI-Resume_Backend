/**
 * AI Service - Uses Anthropic Claude API for:
 *  1. Resume parsing and skill extraction
 *  2. Job-candidate matching
 *  3. Interview report generation
 *  4. Emotion data interpretation
 */

const logger = require('../../config/logger');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-sonnet-4-20250514';

// Helper: call Claude
async function callClaude(systemPrompt, userMessage, maxTokens = 2000) {
  const response = await fetch(ANTHROPIC_URL, {
    method : 'POST',
    headers: {
      'Content-Type'      : 'application/json',
      'x-api-key'         : process.env.ANTHROPIC_API_KEY,
      'anthropic-version' : '2023-06-01',
    },
    body: JSON.stringify({
      model      : MODEL,
      max_tokens : maxTokens,
      system     : systemPrompt,
      messages   : [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Claude API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── 1. Parse Resume ────────────────────────────────────────────────────────
exports.parseResume = async (rawText) => {
  const system = `You are an expert resume parser. Extract all information from the resume text 
and return ONLY a valid JSON object. Do not include markdown backticks or any preamble.`;

  const prompt = `Parse this resume and return a JSON object with these fields:
{
  "name": "", "email": "", "phone": "", "location": "",
  "summary": "", "linkedIn": "", "github": "",
  "skills": [], "techSkills": [], "softSkills": [],
  "experience": [{"title":"","company":"","location":"","startDate":"","endDate":"","current":false,"description":""}],
  "education": [{"degree":"","field":"","institution":"","startYear":0,"endYear":0,"cgpa":""}],
  "certifications": [{"name":"","issuer":"","date":""}],
  "projects": [{"name":"","description":"","techStack":[]}],
  "languages": [],
  "totalYearsOfExperience": 0
}

RESUME TEXT:
${rawText}`;

  try {
    const text = await callClaude(system, prompt, 3000);
    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('Resume parse failed:', err.message);
    return null;
  }
};

// ── 2. Score Resume Quality ────────────────────────────────────────────────
exports.scoreResume = async (parsedData) => {
  const system = `You are a professional recruiter and resume coach. 
Evaluate resumes objectively. Return ONLY a JSON object, no extra text.`;

  const prompt = `Evaluate this candidate profile and return scores (0-100) and insights:
{
  "scores": {
    "overall": 0,
    "skillsMatch": 0,
    "experienceScore": 0,
    "educationScore": 0,
    "presentationScore": 0,
    "atsCompatibility": 0
  },
  "insights": {
    "strengths": [],
    "weaknesses": [],
    "suggestions": [],
    "keywords": [],
    "missingSkills": [],
    "careerLevel": "entry|mid|senior|lead|executive"
  }
}

CANDIDATE PROFILE:
${JSON.stringify(parsedData, null, 2)}`;

  try {
    const text  = await callClaude(system, prompt, 2000);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('Resume scoring failed:', err.message);
    return null;
  }
};

// ── 3. Match Candidate to Job ──────────────────────────────────────────────
exports.matchCandidateToJob = async (resumeParsed, jobData) => {
  const system = `You are an expert AI recruiter. Analyze candidate-job fit objectively. 
Return ONLY valid JSON.`;

  const prompt = `Calculate the match score between this candidate and job:
Return JSON:
{
  "matchScore": 0,
  "breakdown": {
    "skillsMatch": 0,
    "experienceMatch": 0,
    "educationMatch": 0,
    "overallFit": 0
  },
  "insights": [],
  "missingRequirements": [],
  "strengths": [],
  "recommendation": "strong-hire|hire|maybe|no-hire"
}

CANDIDATE:
${JSON.stringify(resumeParsed, null, 2)}

JOB REQUIREMENTS:
Title: ${jobData.title}
Required Skills: ${jobData.requiredSkills?.join(', ')}
Preferred Skills: ${jobData.preferredSkills?.join(', ')}
Experience Required: ${jobData.experience?.min}-${jobData.experience?.max} years
Description: ${jobData.description}`;

  try {
    const text  = await callClaude(system, prompt, 1500);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('Job matching failed:', err.message);
    return null;
  }
};

// ── 4. Generate Interview AI Report ───────────────────────────────────────
exports.generateInterviewReport = async (interviewData, emotionSummary, questions) => {
  const system = `You are an expert HR analyst and behavioral psychologist specializing in 
interview assessment. Generate professional, objective, constructive reports.
Return ONLY valid JSON.`;

  const prompt = `Generate a comprehensive interview assessment report:
{
  "overallScore": 0,
  "communicationScore": 0,
  "technicalScore": 0,
  "bodyLanguageScore": 0,
  "summary": "",
  "strengths": [],
  "areasOfImprovement": [],
  "recommendation": "strong-hire|hire|maybe|no-hire"
}

EMOTION SUMMARY:
${JSON.stringify(emotionSummary, null, 2)}

INTERVIEW DURATION: ${interviewData.duration} minutes
QUESTIONS ASKED: ${questions?.length || 0}
JOB TITLE: ${interviewData.jobTitle || 'Not specified'}

Consider:
- Confidence score: ${emotionSummary?.confidenceScore}%
- Stress level: ${emotionSummary?.stressScore}%
- Engagement: ${emotionSummary?.engagementScore}%
- Composure: ${emotionSummary?.composureScore}%`;

  try {
    const text  = await callClaude(system, prompt, 2000);
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    logger.error('Interview report generation failed:', err.message);
    return null;
  }
};

// ── 5. Interpret Emotion Timeline ─────────────────────────────────────────
exports.interpretEmotionData = async (emotionTimeline) => {
  if (!emotionTimeline || emotionTimeline.length === 0) return null;

  // Aggregate averages locally (saves API cost)
  const totals = { happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0, neutral: 0 };
  let faceDetectedCount = 0;

  emotionTimeline.forEach(snap => {
    if (snap.faceDetected) {
      faceDetectedCount++;
      Object.keys(totals).forEach(e => {
        totals[e] += snap.emotions[e] || 0;
      });
    }
  });

  const count = faceDetectedCount || 1;
  const avg   = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, +(v / count).toFixed(3)]));

  // Derive behavioral metrics
  const confidenceScore  = Math.round(((avg.happy + avg.neutral) / 2) * 100);
  const stressScore      = Math.round(((avg.fearful + avg.angry + avg.sad) / 3) * 100);
  const engagementScore  = Math.round((1 - avg.neutral) * 100);
  const composureScore   = Math.round((1 - (avg.fearful + avg.angry) / 2) * 100);
  const positivityScore  = Math.round(((avg.happy + avg.surprised * 0.5) / 1.5) * 100);

  // Find dominant emotion
  const dominantOverall = Object.entries(avg).sort((a, b) => b[1] - a[1])[0][0];

  // Find peak stress moments
  const peakStressMoments = emotionTimeline
    .filter(s => s.faceDetected && (s.emotions.fearful + s.emotions.angry) > 0.5)
    .map(s => s.timestamp)
    .slice(0, 5);

  // Emotion stability: lower variance = more stable
  const emotionVariances = emotionTimeline
    .filter(s => s.faceDetected)
    .map(s => Math.abs((s.emotions[dominantOverall] || 0) - avg[dominantOverall]));
  const avgVariance = emotionVariances.reduce((a, b) => a + b, 0) / (emotionVariances.length || 1);
  const emotionStability = Math.round(Math.max(0, (1 - avgVariance) * 100));

  // Generate text insights
  const insights = [];
  if (confidenceScore > 70) insights.push('Candidate displayed high confidence throughout the interview.');
  else if (confidenceScore < 40) insights.push('Candidate showed signs of low confidence.');

  if (stressScore > 60) insights.push('Notable stress indicators were detected, particularly in later stages.');
  if (engagementScore > 75) insights.push('Candidate remained highly engaged during the session.');
  if (emotionStability > 80) insights.push('Candidate maintained consistent emotional composure.');
  if (peakStressMoments.length > 2) insights.push('Multiple high-stress moments were recorded; may warrant follow-up.');

  return {
    averageEmotions : avg,
    dominantOverall,
    confidenceScore,
    stressScore,
    engagementScore,
    composureScore,
    positivityScore,
    emotionStability,
    peakStressMoments,
    emotionInsights : insights,
  };
};