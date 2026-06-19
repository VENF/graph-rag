import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '../../../../config/env.js';

export const model = new ChatGoogleGenerativeAI({
  model: 'gemini-3-flash-preview',
  temperature: 0.7,
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});
