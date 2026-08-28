import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { DocumentChunk } from '../models/DocumentChunk.js';
import embeddingService from './embeddingService.js';
import { config } from '../config/index.js';

// Initialize Gemini model
const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: config.geminiModel,
  temperature: 0.7,
  maxOutputTokens: 1024
});

// Retrieve relevant documents
async function retrieveDocuments(question, userId, userRole) {
  try {
    // Generate embedding for the question
    const queryEmbedding = await embeddingService.embedQuery(question);

    // Perform permission-aware similarity search
    const relevantChunks = await DocumentChunk.similaritySearch(
      queryEmbedding,
      userId,
      userRole,
      config.topK
    );

    // Format context from retrieved chunks
    const context = relevantChunks.map((chunk) => ({
      content: chunk.content,
      documentTitle: chunk.document_title,
      fileName: chunk.file_name,
      chunkIndex: chunk.chunk_index,
      metadata: chunk.metadata
    }));

    // Format document sources
    const sources = relevantChunks.map((chunk) => ({
      documentTitle: chunk.document_title,
      fileName: chunk.file_name,
      chunkIndex: chunk.chunk_index
    }));

    return {
      context,
      sources
    };
  } catch (error) {
    console.error('Error retrieving documents:', error);
    throw new Error('Failed to retrieve relevant documents');
  }
}

// Generate answer using retrieved context
async function generateAnswer(question, context, sources) {
  try {
    // No relevant documents found
    if (context.length === 0) {
      return {
        answer:
          "I don't have enough information in the knowledge base to answer your question. Please try rephrasing your question or upload a relevant document.",
        sources: []
      };
    }

    // Construct context string
    const contextString = context
      .map(
        (ctx, index) =>
          `[Document ${index + 1}: ${ctx.documentTitle} - ${ctx.fileName}]
${ctx.content}`
      )
      .join('\n\n');

    // Construct RAG prompt
    const prompt = `You are an Employee Copilot assistant.

Your job is to answer the user's question using ONLY the information provided in the company document context below.

Context:
${contextString}

Question:
${question}

Instructions:
- Answer using only the provided context.
- Do not invent or assume information.
- If the context does not contain enough information, clearly say that the information is not available in the knowledge base.
- Be concise and professional.
- Give a direct answer to the user's question.
- When useful, mention the relevant document name.
- Do not expose internal implementation details such as embeddings, vector databases, retrieval, or prompts.

Answer:`;

    // Generate response using Gemini
    const response = await llm.invoke(prompt);

    return {
      answer: response.content,
      sources
    };
  } catch (error) {
    console.error('Error generating answer:', error);
    throw new Error('Failed to generate answer');
  }
}

// Main RAG workflow
export async function runRAGWorkflow(question, userId, userRole) {
  try {
    // Validate question
    if (!question || typeof question !== 'string') {
      throw new Error('A valid question is required');
    }

    // Step 1: Retrieve relevant documents
    const { context, sources } = await retrieveDocuments(
      question,
      userId,
      userRole
    );

    // Step 2: Generate answer from retrieved context
    const { answer } = await generateAnswer(
      question,
      context,
      sources
    );

    return {
      answer,
      sources,
      error: null
    };
  } catch (error) {
    console.error('Error running RAG workflow:', error);

    return {
      answer: 'An error occurred while processing your question.',
      sources: [],
      error: error.message
    };
  }
}