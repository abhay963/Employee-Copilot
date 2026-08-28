import { useState } from 'react';
import { Upload, FileText, Trash2, Eye, Globe, Lock, Building2 } from 'lucide-react';
import { documentAPI } from '../services/api';

const DocumentCard = ({ document, onView, onDelete, isHR }) => {
  const getVisibilityIcon = () => {
    switch (document.visibility) {
      case 'company':
        return <Globe size={16} className="text-green-500" title="Company-wide" />;
      case 'private':
        return <Lock size={16} className="text-gray-500" title="Private" />;
      default:
        return null;
    }
  };

  const getDocumentTypeIcon = () => {
    switch (document.document_type) {
      case 'hr':
        return <Building2 size={16} className="text-purple-500" title="HR Document" />;
      default:
        return <FileText size={16} className="text-blue-500" title="General Document" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-blue-500" />
          <h3 className="font-semibold text-sm line-clamp-1">{document.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {getVisibilityIcon()}
          {isHR && getDocumentTypeIcon()}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 space-y-1 mb-3">
        <div className="flex items-center gap-1">
          <span className="font-medium">File:</span>
          <span className="line-clamp-1">{document.file_name}</span>
        </div>
        <div>
          <span className="font-medium">Size:</span> {formatFileSize(document.file_size)}
        </div>
        <div>
          <span className="font-medium">Uploaded:</span> {formatDate(document.upload_date)}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onView(document)}
          className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          <Eye size={14} className="inline mr-1" />
          View
        </button>
        <button
          onClick={() => onDelete(document.id)}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const DocumentUpload = ({ onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (files) => {
    if (files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('visibility', 'private');
    formData.append('document_type', 'general');

    setUploading(true);
    try {
      await onUpload(formData);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    handleUpload(e.target.files);
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-6 text-center">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleChange}
        accept=".pdf,.docx,.doc,.txt,.md"
        disabled={uploading}
      />
      <label
        htmlFor="file-upload"
        className={`cursor-pointer ${dragActive ? 'border-blue-500 bg-blue-50' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload size={32} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PDF, Word, TXT, MD (max 10MB)
        </p>
      </label>
    </div>
  );
};

const Documents = ({ documents, onUpload, onDelete, onView, isHR }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-4">Documents</h2>
        <DocumentUpload onUpload={onUpload} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {documents && documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onView={onView}
                onDelete={onDelete}
                isHR={isHR}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <FileText size={48} className="mx-auto mb-4" />
            <p>No documents yet. Upload your first document to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
