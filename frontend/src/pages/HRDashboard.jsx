import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, MessageSquare, Users, Building2, LogOut, Calendar } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { documentAPI, conversationAPI, userAPI } from '../services/api';
import Copilot from '../components/Copilot';
import Documents from '../components/Documents';
import ConversationList from '../components/ConversationList';
import LeaveManagement from '../components/LeaveManagement';

const HRDashboard = () => {
  const { user, isHR, logout } = useUser();
  const [activeTab, setActiveTab] = useState('copilot');
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isHR) {
      loadData();
    }
  }, [isHR]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [docsResponse, convsResponse, usersResponse] = await Promise.all([
        documentAPI.getDocuments(),
        conversationAPI.getConversations(),
        userAPI.getAllUsers()
      ]);

      if (docsResponse.success) {
        setDocuments(docsResponse.documents);
      }
      if (convsResponse.success) {
        setConversations(convsResponse.conversations);
      }
      if (usersResponse.success) {
        setAllUsers(usersResponse.users);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const response = await conversationAPI.createConversation({});
      if (response.success) {
        setConversations([response.conversation, ...conversations]);
        setActiveConversation(response.conversation);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    try {
      const response = await conversationAPI.getConversationById(conversation.id);
      if (response.success) {
        setActiveConversation(response.conversation);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSendMessage = async (conversationId, data) => {
    try {
      const response = await conversationAPI.sendMessage(conversationId, data);
      if (response.success) {
        setActiveConversation(response.conversation);
        setConversations(prev =>
          prev.map(c => c.id === response.conversation.id ? response.conversation : c)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await conversationAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleEditConversation = async (conversationId, data) => {
    try {
      const response = await conversationAPI.updateConversationTitle(conversationId, data);
      if (response.success) {
        setConversations(prev =>
          prev.map(c => c.id === conversationId ? response.conversation : c)
        );
        if (activeConversation?.id === conversationId) {
          setActiveConversation(response.conversation);
        }
      }
    } catch (error) {
      console.error('Error editing conversation:', error);
    }
  };

  const handleUploadDocument = async (formData) => {
    try {
      const response = await documentAPI.uploadDocument(formData);
      if (response.success) {
        setDocuments([response.document, ...documents]);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      await documentAPI.deleteDocument(documentId);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleViewDocument = (document) => {
    alert(`Document: ${document.title}\n\nContent preview: ${document.content?.substring(0, 200)}...`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard size={32} className="text-purple-500" />
              <div>
                <h1 className="text-xl font-bold">HR Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('copilot')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'copilot'
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageSquare size={18} className="inline mr-2" />
              Copilot
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'documents'
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText size={18} className="inline mr-2" />
              Documents
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={18} className="inline mr-2" />
              Employees
            </button>
            <button
              onClick={() => setActiveTab('leave')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'leave'
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar size={18} className="inline mr-2" />
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
            <div className="lg:col-span-1">
              <ConversationList
                conversations={conversations}
                activeConversation={activeConversation}
                onSelect={handleSelectConversation}
                onCreate={handleCreateConversation}
                onDelete={handleDeleteConversation}
                onEdit={handleEditConversation}
              />
            </div>
            <div className="lg:col-span-3">
              <Copilot
                conversation={activeConversation}
                onSendMessage={handleSendMessage}
                onDeleteConversation={handleDeleteConversation}
              />
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="h-[calc(100vh-200px)]">
            <Documents
              documents={documents}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              onView={handleViewDocument}
              isHR={true}
            />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">All Employees</h2>
              <p className="text-sm text-gray-600 mt-1">
                Total: {allUsers.length} employees
              </p>
            </div>
            <div className="p-6">
              {allUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">Role</th>
                        <th className="text-left py-3 px-4 font-semibold">Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{user.name}</td>
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.role === 'hr' 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">{user.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users size={48} className="mx-auto mb-4" />
                  <p>No employees found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="h-[calc(100vh-200px)]">
            <LeaveManagement isHR={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
