import { Document } from '../models/Document.js';
import documentProcessor from '../services/documentProcessor.js';
import fs from 'fs';

export const getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const documents = await Document.findAccessibleByUser(
      userId,
      userRole
    );

    res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Error getting documents:', error);

    res.status(500).json({
      error: 'Failed to get documents',
    });
  }
};

export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    // HR and Admin can access all documents.
    // Employees can access their own documents
    // and company-wide documents.
    if (
      userRole !== 'hr' &&
      userRole !== 'admin' &&
      document.owner_id !== userId &&
      document.visibility !== 'company'
    ) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Error getting document:', error);

    res.status(500).json({
      error: 'Failed to get document',
    });
  }
};

export const uploadDocument = async (req, res) => {
  let tempFilePath = null;

  try {
    // --------------------------------------------------
    // 1. Check uploaded file
    // --------------------------------------------------
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    tempFilePath = req.file.path;
    const userId = req.user.id;
    const userRole = req.user.role;

    const {
      title,
      visibility,
      document_type,
      version,
      effective_from,
      effective_until,
    } = req.body;

    // --------------------------------------------------
    // 2. Determine file type
    // --------------------------------------------------
    const fileType = documentProcessor.getFileType(
      req.file.originalname
    );

    // --------------------------------------------------
    // 3. Validate file type
    // --------------------------------------------------
    if (!documentProcessor.isValidFileType(fileType)) {
      return res.status(400).json({
        error:
          'Invalid file type. Supported types: PDF, Word, TXT, MD',
      });
    }

    // --------------------------------------------------
    // 4. Validate HR/policy document permissions
    // --------------------------------------------------
    if (
      document_type &&
      ['hr', 'policy'].includes(document_type) &&
      userRole !== 'hr' &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({
        error:
          'HR or Admin access required to upload HR/policy documents',
      });
    }

    // --------------------------------------------------
    // 5. Validate company visibility permissions
    // --------------------------------------------------
    if (
      visibility === 'company' &&
      userRole !== 'hr' &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({
        error:
          'HR or Admin access required to upload company-wide documents',
      });
    }

    // --------------------------------------------------
    // 6. Extract text from uploaded document
    // --------------------------------------------------
    console.log(
      `Extracting text from ${req.file.originalname}...`
    );

    const content =
      await documentProcessor.extractText(
        req.file.path,
        fileType
      );

    // --------------------------------------------------
    // 7. Create document database record
    // --------------------------------------------------
    const document = await Document.create({
      title:
        title || req.file.originalname,

      file_name:
        req.file.originalname,

      file_type:
        fileType,

      file_size:
        req.file.size,

      file_path:
        req.file.path,

      content:
        content,

      owner_id:
        userId,

      visibility:
        visibility || 'private',

      document_type:
        document_type || 'general',

      version,
      effective_from,
      effective_until,
      status: 'active',
    });

    console.log(
      `Document ${document.id} created successfully`
    );

    // --------------------------------------------------
    // 8. Supersede old policies if this is a new active policy
    // --------------------------------------------------
    if (
      document_type &&
      ['hr', 'policy'].includes(document_type) &&
      status === 'active'
    ) {
      try {
        await Document.supersedeOldPolicies(document_type, document.id);
        console.log(
          `Superseded old policies for document type: ${document_type}`
        );
      } catch (supersedeError) {
        console.error(
          'Error superseding old policies:',
          supersedeError
        );
        // Non-critical error - continue with processing
      }
    }

    // --------------------------------------------------
    // 9. Process document for RAG
    //
    // extract → clean → chunk → embed → store
    // --------------------------------------------------
    try {
      console.log(
        `Starting RAG processing for document ${document.id}...`
      );

      await documentProcessor.processDocument(
        document.id,
        req.file.path,
        fileType,
        {
          title: document.title,
          file_name: document.file_name,
          owner_id: userId,
          visibility: document.visibility,
          document_type: document.document_type,
        }
      );

      console.log(
        `RAG processing completed for document ${document.id}`
      );
    } catch (processingError) {
      console.error(
        `Error processing document ${document.id} for RAG:`,
        processingError
      );

      // RAG processing failed - delete the document record
      await Document.delete(document.id);

      throw new Error(
        `Document indexing failed: ${processingError.message}`
      );
    }

    // --------------------------------------------------
    // 9. Delete temporary file after successful indexing
    // --------------------------------------------------
    if (fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(
          `Temporary file deleted after successful indexing: ${req.file.path}`
        );
      } catch (cleanupError) {
        console.error(
          'Error deleting temporary file:',
          cleanupError
        );
        // Non-critical error - document is already indexed
      }
    }

    // --------------------------------------------------
    // 10. Send response
    // --------------------------------------------------
    return res.status(200).json({
      success: true,
      document,
      message: 'Document uploaded and indexed successfully',
    });
  } catch (error) {
    console.error(
      'Error uploading document:',
      error
    );

    // --------------------------------------------------
    // 11. Cleanup uploaded file if something failed
    // --------------------------------------------------
    if (
      tempFilePath &&
      fs.existsSync(tempFilePath)
    ) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(
          'Uploaded file cleaned up after failure'
        );
      } catch (cleanupError) {
        console.error(
          'Error cleaning up uploaded file:',
          cleanupError
        );
      }
    }

    return res.status(500).json({
      error: 'Failed to upload document',
    });
  }
};

export const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.id;
    const userRole = req.user.role;

    const {
      title,
      visibility,
      document_type,
    } = req.body;

    // --------------------------------------------------
    // 1. Find document
    // --------------------------------------------------
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    // --------------------------------------------------
    // 2. Check ownership
    // --------------------------------------------------
    // HR and Admin can update any document.
    // Employees can update only their own documents.
    if (
      userRole !== 'hr' &&
      userRole !== 'admin' &&
      document.owner_id !== userId
    ) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    // --------------------------------------------------
    // 3. HR-only document type
    // --------------------------------------------------
    if (
      document_type === 'hr' &&
      userRole !== 'hr' &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({
        error:
          'HR or Admin access required to set HR document type',
      });
    }

    // --------------------------------------------------
    // 4. Company visibility is HR-only
    // --------------------------------------------------
    if (
      visibility === 'company' &&
      userRole !== 'hr' &&
      userRole !== 'admin'
    ) {
      return res.status(403).json({
        error:
          'HR or Admin access required to set company visibility',
      });
    }

    // --------------------------------------------------
    // 5. Update document
    // --------------------------------------------------
    const updated = await Document.update(id, {
      title,
      visibility,
      document_type,
    });

    return res.json({
      success: true,
      document: updated,
    });
  } catch (error) {
    console.error(
      'Error updating document:',
      error
    );

    return res.status(500).json({
      error: 'Failed to update document',
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.id;
    const userRole = req.user.role;

    // --------------------------------------------------
    // 1. Find document
    // --------------------------------------------------
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    // --------------------------------------------------
    // 2. Check ownership
    // --------------------------------------------------
    // HR and Admin can delete any document.
    // Employees can delete only their own documents.
    if (
      userRole !== 'hr' &&
      userRole !== 'admin' &&
      document.owner_id !== userId
    ) {
      return res.status(403).json({
        error: 'Access denied',
      });
    }

    // --------------------------------------------------
    // 3. Delete RAG chunks
    // --------------------------------------------------
    try {
      await documentProcessor.deleteDocumentChunks(id);
    } catch (chunkError) {
      console.error(
        'Error deleting document chunks:',
        chunkError
      );

      // Continue deleting the document itself.
    }

    // --------------------------------------------------
    // 4. Delete physical file
    // --------------------------------------------------
    if (
      document.file_path &&
      fs.existsSync(document.file_path)
    ) {
      try {
        fs.unlinkSync(document.file_path);

        console.log(
          `Deleted document file: ${document.file_path}`
        );
      } catch (fileError) {
        console.error(
          'Error deleting document file:',
          fileError
        );
      }
    }

    // --------------------------------------------------
    // 5. Delete database record
    // --------------------------------------------------
    await Document.delete(id);

    return res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error(
      'Error deleting document:',
      error
    );

    return res.status(500).json({
      error: 'Failed to delete document',
    });
  }
};

export const getDocumentsByType = async (req, res) => {
  try {
    const { type } = req.params;

    const userRole = req.user.role;

    // --------------------------------------------------
    // Only HR can filter by document type
    // --------------------------------------------------
    if (userRole !== 'hr') {
      return res.status(403).json({
        error: 'HR access required',
      });
    }

    // --------------------------------------------------
    // Get documents
    // --------------------------------------------------
    const documents =
      await Document.findByType(type);

    return res.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error(
      'Error getting documents by type:',
      error
    );

    return res.status(500).json({
      error: 'Failed to get documents',
    });
  }
};