
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  LogOut,
  Calendar
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import {
  documentAPI,
  conversationAPI,
  userAPI
} from '../services/api';

import Copilot from '../components/Copilot';
import Documents from '../components/Documents';
import ConversationList from '../components/ConversationList';
import LeaveManagement from '../components/LeaveManagement';
import EmployeeCalendar from '../components/EmployeeCalendar';

const HRDashboard = () => {
  const { user, isHR, logout } = useUser();

  const [activeTab, setActiveTab] = useState('copilot');

  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeConversation, setActiveConversation] =
    useState(null);

  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD HR DATA
  // ============================================================

  useEffect(() => {
    if (isHR) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isHR]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        docsResponse,
        convsResponse,
        usersResponse
      ] = await Promise.all([
        documentAPI.getDocuments(),
        conversationAPI.getConversations(),
        userAPI.getAllUsers()
      ]);

      if (docsResponse?.success) {
        setDocuments(
          Array.isArray(docsResponse.documents)
            ? docsResponse.documents
            : []
        );
      }

      if (convsResponse?.success) {
        setConversations(
          Array.isArray(convsResponse.conversations)
            ? convsResponse.conversations
            : []
        );
      }

      if (usersResponse?.success) {
        setAllUsers(
          Array.isArray(usersResponse.users)
            ? usersResponse.users
            : []
        );
      }
    } catch (error) {
      console.error(
        'Error loading HR data:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CREATE CONVERSATION
  // ============================================================

  const handleCreateConversation = async () => {
    try {
      const response =
        await conversationAPI.createConversation({});

      if (
        response?.success &&
        response?.conversation
      ) {
        setConversations((prev) => [
          response.conversation,
          ...prev
        ]);

        setActiveConversation(
          response.conversation
        );
      }
    } catch (error) {
      console.error(
        'Error creating conversation:',
        error
      );
    }
  };

  // ============================================================
  // SELECT CONVERSATION
  // ============================================================

  const handleSelectConversation = async (
    conversation
  ) => {
    try {
      const response =
        await conversationAPI.getConversationById(
          conversation.id
        );

      if (
        response?.success &&
        response?.conversation
      ) {
        setActiveConversation(
          response.conversation
        );
      }
    } catch (error) {
      console.error(
        'Error loading conversation:',
        error
      );
    }
  };

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  const handleSendMessage = async (
    conversationId,
    data
  ) => {
    try {
      const response =
        await conversationAPI.sendMessage(
          conversationId,
          data
        );

      if (
        response?.success &&
        response?.conversation
      ) {
        setActiveConversation(
          response.conversation
        );

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id ===
            response.conversation.id
              ? response.conversation
              : conversation
          )
        );
      }
    } catch (error) {
      console.error(
        'Error sending message:',
        error
      );

      throw error;
    }
  };

  // ============================================================
  // DELETE CONVERSATION
  // ============================================================

  const handleDeleteConversation = async (
    conversationId
  ) => {
    try {
      await conversationAPI.deleteConversation(
        conversationId
      );

      setConversations((prev) =>
        prev.filter(
          (conversation) =>
            conversation.id !== conversationId
        )
      );

      if (
        activeConversation?.id ===
        conversationId
      ) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error(
        'Error deleting conversation:',
        error
      );
    }
  };

  // ============================================================
  // EDIT CONVERSATION TITLE
  // ============================================================

  const handleEditConversation = async (
    conversationId,
    data
  ) => {
    try {
      const response =
        await conversationAPI.updateConversationTitle(
          conversationId,
          data
        );

      if (
        response?.success &&
        response?.conversation
      ) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === conversationId
              ? response.conversation
              : conversation
          )
        );

        if (
          activeConversation?.id ===
          conversationId
        ) {
          setActiveConversation(
            response.conversation
          );
        }
      }
    } catch (error) {
      console.error(
        'Error editing conversation:',
        error
      );
    }
  };

  // ============================================================
  // UPLOAD DOCUMENT
  // ============================================================

  const handleUploadDocument = async (
    formData
  ) => {
    try {
      const response =
        await documentAPI.uploadDocument(
          formData
        );

      if (
        response?.success &&
        response?.document
      ) {
        setDocuments((prev) => [
          response.document,
          ...prev
        ]);
      }
    } catch (error) {
      console.error(
        'Error uploading document:',
        error
      );

      throw error;
    }
  };

  // ============================================================
  // DELETE DOCUMENT
  // ============================================================

  const handleDeleteDocument = async (
    documentId
  ) => {
    try {
      await documentAPI.deleteDocument(
        documentId
      );

      setDocuments((prev) =>
        prev.filter(
          (document) =>
            document.id !== documentId
        )
      );
    } catch (error) {
      console.error(
        'Error deleting document:',
        error
      );
    }
  };

  // ============================================================
  // VIEW DOCUMENT
  // ============================================================

  const handleViewDocument = (document) => {
    const preview =
      document.content?.substring(0, 200) || '';

    alert(
      'Document: ' +
        document.title +
        '\n\nContent preview: ' +
        preview +
        '...'
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto" />

          <p className="mt-4 text-gray-600">
            Loading HR Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">

            {/* BRAND */}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <LayoutDashboard
                  size={22}
                  className="text-purple-600"
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  HR Dashboard
                </h1>

                <p className="text-sm text-gray-600">
                  Welcome, {user?.name || 'HR'}
                </p>
              </div>
            </div>

            {/* LOGOUT */}

            <button
              onClick={logout}
              className="
                flex items-center gap-2
                px-4 py-2
                text-gray-600
                hover:text-gray-900
                hover:bg-gray-100
                rounded-lg
                transition
              "
            >
              <LogOut size={18} />

              <span>
                Logout
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">

            {/* COPILOT */}

            <button
              onClick={() =>
                setActiveTab('copilot')
              }
              className={`
                flex items-center gap-2
                px-4 py-3
                font-medium
                whitespace-nowrap
                transition-colors
                ${
                  activeTab === 'copilot'
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <MessageSquare size={18} />

              Copilot
            </button>

            {/* DOCUMENTS */}

            <button
              onClick={() =>
                setActiveTab('documents')
              }
              className={`
                flex items-center gap-2
                px-4 py-3
                font-medium
                whitespace-nowrap
                transition-colors
                ${
                  activeTab === 'documents'
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <FileText size={18} />

              Documents
            </button>

            {/* EMPLOYEES */}

            <button
              onClick={() =>
                setActiveTab('users')
              }
              className={`
                flex items-center gap-2
                px-4 py-3
                font-medium
                whitespace-nowrap
                transition-colors
                ${
                  activeTab === 'users'
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Users size={18} />

              Employees
            </button>

            {/* CALENDAR */}

            <button
              onClick={() =>
                setActiveTab('calendar')
              }
              className={`
                flex items-center gap-2
                px-4 py-3
                font-medium
                whitespace-nowrap
                transition-colors
                ${
                  activeTab === 'calendar'
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Calendar size={18} />

              Calendar
            </button>

            {/* LEAVE */}

            <button
              onClick={() =>
                setActiveTab('leave')
              }
              className={`
                flex items-center gap-2
                px-4 py-3
                font-medium
                whitespace-nowrap
                transition-colors
                ${
                  activeTab === 'leave'
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <Calendar size={18} />

              Leave
            </button>

          </div>
        </div>
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ====================================================
            COPILOT
        ==================================================== */}

        {activeTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">

            <div className="lg:col-span-1 min-h-0">
              <ConversationList
                conversations={conversations}
                activeConversation={
                  activeConversation
                }
                onSelect={
                  handleSelectConversation
                }
                onCreate={
                  handleCreateConversation
                }
                onDelete={
                  handleDeleteConversation
                }
                onEdit={
                  handleEditConversation
                }
              />
            </div>

            <div className="lg:col-span-3 min-h-0">
              <Copilot
                conversation={
                  activeConversation
                }
                onSendMessage={
                  handleSendMessage
                }
                onDeleteConversation={
                  handleDeleteConversation
                }
              />
            </div>

          </div>
        )}

        {/* ====================================================
            DOCUMENTS
        ==================================================== */}

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

        {/* ====================================================
            EMPLOYEES
        ==================================================== */}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">

            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">
                All Employees
              </h2>

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

                        <th className="text-left py-3 px-4 font-semibold">
                          Name
                        </th>

                        <th className="text-left py-3 px-4 font-semibold">
                          Email
                        </th>

                        <th className="text-left py-3 px-4 font-semibold">
                          Role
                        </th>

                        <th className="text-left py-3 px-4 font-semibold">
                          Department
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {allUsers.map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b hover:bg-gray-50"
                        >

                          <td className="py-3 px-4">
                            {employee.name}
                          </td>

                          <td className="py-3 px-4">
                            {employee.email}
                          </td>

                          <td className="py-3 px-4">

                            <span
                              className={`
                                px-2 py-1
                                rounded
                                text-xs
                                ${
                                  employee.role === 'hr'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }
                              `}
                            >
                              {employee.role}
                            </span>

                          </td>

                          <td className="py-3 px-4">
                            {employee.department}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">

                  <Users
                    size={48}
                    className="mx-auto mb-4"
                  />

                  <p>
                    No employees found
                  </p>

                </div>
              )}

            </div>
          </div>
        )}

        {/* ====================================================
            CALENDAR
        ==================================================== */}

        {activeTab === 'calendar' && (
          <div className="min-h-[calc(100vh-200px)]">
            <EmployeeCalendar />
          </div>
        )}

        {/* ====================================================
            LEAVE
        ==================================================== */}

        {activeTab === 'leave' && (
          <div className="h-[calc(100vh-200px)]">
            <LeaveManagement
              isHR={true}
            />
          </div>
        )}

      </main>
    </div>
  );
};

export default HRDashboard;
