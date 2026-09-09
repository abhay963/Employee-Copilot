import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../../config/index.js';

// ============================================================
// GEMINI LLM
// ============================================================

class GeminiLLM {
  constructor() {
    if (!config.geminiApiKey) {
      throw new Error(
        'GEMINI_API_KEY is required for Gemini LLM'
      );
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey: config.geminiApiKey,
      model: config.geminiModel,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });

    console.log(
      `[Gemini] LLM initialized | model=${config.geminiModel}`
    );
  }

  // ==========================================================
  // INVOKE
  // ==========================================================

  async invoke(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error(
        'A valid prompt is required'
      );
    }

    return this.model.invoke(prompt);
  }

  // ==========================================================
  // STREAM
  // ==========================================================

  async stream(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error(
        'A valid prompt is required'
      );
    }

    return this.model.stream(prompt);
  }

  // ==========================================================
  // GET MODEL
  // ==========================================================

  getModel() {
    return this.model;
  }
}

// ============================================================
// SINGLETON
// ============================================================

const geminiLLM = new GeminiLLM();

export default geminiLLM;