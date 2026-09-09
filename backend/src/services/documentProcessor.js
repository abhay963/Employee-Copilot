import fs from 'fs';
import path from 'path';

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

import embeddingService from '../ai/embeddings/embeddingService.js';
import { DocumentChunk } from '../models/DocumentChunk.js';
import { config } from '../config/index.js';

class DocumentProcessor {
  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });
  }

  // Extract text from different file types
  async extractText(filePath, fileType) {
    try {
      const buffer = fs.readFileSync(filePath);

      switch (fileType) {
        case 'application/pdf':
          return await this.extractFromPDF(buffer);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractFromWord(buffer);

        case 'text/plain':
        case 'text/markdown':
          return buffer.toString('utf-8');

        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('Error extracting document text:', error);
      throw error;
    }
  }

  // Extract text from PDF
  async extractFromPDF(buffer) {
    let parser;

    try {
      parser = new PDFParse({
        data: buffer,
      });

      const result = await parser.getText();

      return result?.text || '';
    } catch (error) {
      console.error('Error extracting text from PDF:', error);

      throw new Error(
        `Failed to extract text from PDF: ${error.message}`
      );
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (destroyError) {
          console.error(
            'Error destroying PDF parser:',
            destroyError
          );
        }
      }
    }
  }

  // Extract text from Word document
  async extractFromWord(buffer) {
    try {
      const result = await mammoth.extractRawText({
        buffer,
      });

      return result.value || '';
    } catch (error) {
      console.error('Error extracting text from Word document:', error);

      throw new Error('Failed to extract text from Word document');
    }
  }

  // Clean and normalize extracted text
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ ]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Split document into chunks
  async splitDocument(text, metadata = {}) {
    try {
      const chunks = await this.textSplitter.splitText(text);

      return chunks.map((chunk, index) => ({
        content: chunk,
        index,
        metadata,
      }));
    } catch (error) {
      console.error('Error splitting document:', error);

      throw new Error('Failed to split document into chunks');
    }
  }

  // Process complete document:
  // extract → clean → split → embed → store
  async processDocument(
    documentId,
    filePath,
    fileType,
    metadata = {}
  ) {
    try {
      console.log(`Processing document ${documentId}...`);

      // Step 1: Extract text
      const rawText = await this.extractText(
        filePath,
        fileType
      );

      // Step 2: Clean text
      const cleanedText = this.cleanText(rawText);

      if (!cleanedText || cleanedText.length < 10) {
        throw new Error(
          'Document contains too little text to process'
        );
      }

      console.log(
        `Extracted ${cleanedText.length} characters`
      );

      // Step 3: Split into chunks
      const chunks = await this.splitDocument(
        cleanedText,
        metadata
      );

      if (chunks.length === 0) {
        throw new Error(
          'Failed to split document into chunks'
        );
      }

      console.log(
        `Document split into ${chunks.length} chunks`
      );

      // Step 4: Generate embeddings
      const chunkTexts = chunks.map(
        (chunk) => chunk.content
      );

      const embeddings =
        await embeddingService.embedDocuments(chunkTexts);

      if (
        !embeddings ||
        embeddings.length !== chunks.length
      ) {
        throw new Error(
          'Embedding generation failed or returned an invalid number of embeddings'
        );
      }

      console.log(
        `Generated ${embeddings.length} embeddings`
      );

      // Step 5: Prepare database records
      const chunkData = chunks.map((chunk, index) => ({
        document_id: documentId,
        chunk_index: chunk.index,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: {
          ...chunk.metadata,
          chunk_count: chunks.length,
          chunk_index: chunk.index,
        },
      }));

      // Step 6: Store chunks
      const storedChunks =
        await DocumentChunk.createMany(chunkData);

      console.log(
        `Stored ${storedChunks.length} chunks in database`
      );

      return {
        success: true,
        chunkCount: storedChunks.length,
        chunks: storedChunks,
      };
    } catch (error) {
      console.error(
        'Error processing document:',
        error
      );

      throw error;
    }
  }

  // Delete all chunks belonging to a document
  async deleteDocumentChunks(documentId) {
    try {
      const deletedChunks =
        await DocumentChunk.deleteByDocumentId(
          documentId
        );

      console.log(
        `Deleted ${deletedChunks.length} chunks for document ${documentId}`
      );

      return deletedChunks.length;
    } catch (error) {
      console.error(
        'Error deleting document chunks:',
        error
      );

      throw error;
    }
  }

  // Get MIME type from file extension
  getFileType(fileName) {
    const ext = path
      .extname(fileName)
      .toLowerCase();

    const typeMap = {
      '.pdf': 'application/pdf',

      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      '.doc':
        'application/msword',

      '.txt':
        'text/plain',

      '.md':
        'text/markdown',
    };

    return (
      typeMap[ext] ||
      'application/octet-stream'
    );
  }

  // Validate supported file type
  isValidFileType(fileType) {
    const validTypes = [
      'application/pdf',

      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      'application/msword',

      'text/plain',

      'text/markdown',
    ];

    return validTypes.includes(fileType);
  }
}

export default new DocumentProcessor();