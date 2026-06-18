const pdfParse   = require('pdf-parse');
const fs         = require('fs');
const Resume     = require('../models/Resume.model');
const aiService  = require('./ai/ai.service');
const logger     = require('../config/logger');

// ── Extract text from uploaded file ───────────────────────────────────────
exports.extractTextFromFile = async (filePath, mimetype) => {
  if (mimetype === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  if (mimetype.includes('word') || mimetype.includes('officedocument')) {
    try {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch {
      throw new Error('Word document parsing failed.');
    }
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
};

// ── Full resume analysis pipeline ─────────────────────────────────────────
exports.analyzeResume = async (resumeId) => {
  const resume = await Resume.findById(resumeId);
  if (!resume) throw new Error('Resume not found');

  try {
    await Resume.findByIdAndUpdate(resumeId, { status: 'processing' });

    logger.info(`[Resume] Extracting text from ${resume.file.path}`);
    const rawText = await exports.extractTextFromFile(resume.file.path, resume.file.mimetype);

    logger.info(`[Resume] Parsing with AI...`);
    const parsed = await aiService.parseResume(rawText);
    if (!parsed) throw new Error('AI parsing returned null');

    logger.info(`[Resume] Scoring with AI...`);
    const scored = await aiService.scoreResume(parsed);

    await Resume.findByIdAndUpdate(resumeId, {
      rawText,
      parsed,
      scores    : scored?.scores || {},
      insights  : scored?.insights || {},
      status    : 'analyzed',
      analyzedAt: new Date(),
    });

    logger.info(`[Resume] Analysis complete for resume ${resumeId}`);
    return await Resume.findById(resumeId);

  } catch (err) {
    await Resume.findByIdAndUpdate(resumeId, { status: 'failed' });
    logger.error(`[Resume] Analysis failed for ${resumeId}: ${err.message}`);
    throw err;
  }
};