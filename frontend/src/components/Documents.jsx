import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Globe,
  Lock,
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  X,
  File,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  Download,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { documentAPI } from '../services/api';

const getFileIcon = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const iconMap = {
    pdf: { icon: FileText, color: 'text-red-500', bg: 'bg-red-50' },
    doc: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    docx: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
    txt: { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' },
    md: { icon: FileCode, color: 'text-purple-500', bg: 'bg-purple-50' },
    jpg: { icon: ImageIcon, color: 'text-green-500', bg: 'bg-green-50' },
    jpeg: { icon: ImageIcon, color: 'text-green-500', bg: 'bg-green-50' },
    png: { icon: ImageIcon, color: 'text-green-500', bg: 'bg-green-50' },
    xlsx: { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    xls: { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    zip: { icon: FileArchive, color: 'text-amber-500', bg: 'bg-amber-50' },
    rar: { icon: FileArchive, color: 'text-amber-500', bg: 'bg-amber-50' },
  };
  return iconMap[ext] || { icon: File, color: 'text-gray-500', bg: 'bg-gray-50' };
};

const DocumentCard = ({ document, onView, onDelete, isHR }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { icon: Icon, color, bg } = getFileIcon(document.file_name);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon size={24} className={color} />
          </div>
          <div className="flex items-center gap-1">
            {document.visibility === 'company' && (
              <Globe size={16} className="text-emerald-500" title="Company-wide" />
            )}
            {document.visibility === 'private' && (
              <Lock size={16} className="text-gray-400" title="Private" />
            )}
            {isHR && document.document_type === 'hr' && (
              <Building2 size={16} className="text-purple-500" title="HR Document" />
            )}
          </div>
        </div>

        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
          {document.title}
        </h3>
        
        <p className="text-sm text-gray-500 mb-3 line-clamp-1">
          {document.file_name}
        </p>

        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>{formatDate(document.upload_date)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onView(document)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors text-sm font-medium"
          >
            <Eye size={14} />
            View
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <MoreVertical size={16} className="text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10">
                <button
                  onClick={() => {
                    onView(document);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  onClick={() => {
                    onDelete(document.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DocumentUpload = ({ onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleUpload = async (files) => {
    if (files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    formData.append('visibility', 'private');
    formData.append('document_type', 'general');

    setUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onUpload(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
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
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
        <span className="text-sm text-gray-500">Max 10MB</span>
      </div>
      
      <motion.div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-violet-400 bg-violet-50'
            : uploading
            ? 'border-gray-200 bg-gray-50'
            : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.docx,.doc,.txt,.md"
          disabled={uploading}
        />
        
        {!uploading ? (
          <label
            htmlFor="file-upload"
            className="cursor-pointer block"
          >
            <motion.div
              animate={dragActive ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                dragActive ? 'bg-violet-100' : 'bg-gray-100'
              }`}>
                <Upload size={32} className={dragActive ? 'text-violet-600' : 'text-gray-400'} />
              </div>
              <p className="text-base font-medium text-gray-700 mb-1">
                {dragActive ? 'Drop your file here' : 'Drag & drop your file'}
              </p>
              <p className="text-sm text-gray-500 mb-3">or click to browse</p>
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="px-2 py-1 bg-gray-100 rounded">PDF</span>
                <span className="px-2 py-1 bg-gray-100 rounded">DOCX</span>
                <span className="px-2 py-1 bg-gray-100 rounded">TXT</span>
                <span className="px-2 py-1 bg-gray-100 rounded">MD</span>
              </div>
            </motion.div>
          </label>
        ) : (
          <div className="py-4">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-violet-100">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Upload size={32} className="text-violet-600" />
              </motion.div>
            </div>
            <p className="text-base font-medium text-gray-700 mb-2">Uploading...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <motion.div
                className="bg-violet-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-500">{uploadProgress}%</p>
          </div>
        )}

        {uploadError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2"
          >
            <AlertCircle size={16} className="text-rose-600" />
            <p className="text-sm text-rose-700">{uploadError}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

const Documents = ({ documents, onUpload, onDelete, onView, isHR = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const getFilteredDocuments = () => {
    let filtered = documents || [];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // File type filter
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(doc => {
        const ext = doc.file_name?.split('.').pop()?.toLowerCase();
        return ext === fileTypeFilter;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.upload_date) - new Date(b.upload_date);
      } else if (sortBy === 'name') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'size') {
        comparison = (a.file_size || 0) - (b.file_size || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();
  const documentCount = filteredDocuments.length;

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col space-y-6 pb-8">
      {/* Header */}
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Documents</h2>
        <p className="text-sm text-gray-500">Manage company documents and files</p>
      </div>

      {/* Statistics */}
      <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Documents"
          value={documents?.length || 0}
          icon={FileText}
          color="bg-gradient-to-br from-violet-500 to-indigo-600"
        />
        <StatCard
          title="Company-wide"
          value={documents?.filter(d => d.visibility === 'company').length || 0}
          icon={Globe}
          color="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <StatCard
          title="Private"
          value={documents?.filter(d => d.visibility === 'private').length || 0}
          icon={Lock}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      {/* Upload Section */}
      <div className="flex-shrink-0">
        <DocumentUpload onUpload={onUpload} />
      </div>

      {/* Filters and Search */}
      <div className="flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={fileTypeFilter}
              onChange={(e) => setFileTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="txt">Text</option>
              <option value="md">Markdown</option>
            </select>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <ArrowUpDown size={16} />
              <span className="hidden sm:inline">Sort</span>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">All Documents</h3>
          <span className="text-sm text-gray-500">
            {documentCount} document{documentCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-5">
          {documentCount > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((document, index) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DocumentCard
                    document={document}
                    onView={onView}
                    onDelete={onDelete}
                    isHR={isHR}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText size={40} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchTerm || fileTypeFilter !== 'all'
                    ? 'No documents match your filters'
                    : 'Upload your first document to get started'}
                </p>
                {(searchTerm || fileTypeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFileTypeFilter('all');
                    }}
                    className="px-4 py-2 bg-violet-50 text-violet-700 rounded-xl hover:bg-violet-100 transition-colors text-sm font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;