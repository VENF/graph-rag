import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { env } from '../../../../config/env.js';

export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
});
