import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  LogOut,
  Calendar,
  User,
  Clock,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Mail,
  Shield,
  Search,
  MoreVertical,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  FileText,
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import {
  conversationAPI,
  documentAPI,
  userAPI,
  adminAPI,
} from '../services/api';

import Copilot from '../components/Copilot';
import Documents from '../components/Documents';
import ConversationList from '../components/ConversationList';
import LeaveManagement from '../components/LeaveManagement';
import EmployeeCalendar from '../components/EmployeeCalendar';
import Profile from '../components/Profile';
import Gmail from '../components/Gmail';
import UserManagement from '../components/UserManagement';
import ValidEmployeeIds from '../components/ValidEmployeeIds';

const AdminDashboard = () => {
  const { user, isAdmin, logout } = useUser();

  const [activeTab, setActiveTab] = useState('users');

  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);

  const [activeConversation, setActiveConversation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ============================================================
  // LOAD ADMIN DATA
  // ============================================================

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        docsResponse,
        convsResponse,
        usersResponse,
        statsResponse,
      ] = await Promise.all([
        documentAPI.getDocuments(),
        conversationAPI.getConversations(),
        adminAPI.getUsers(),
        adminAPI.getUserStats(),
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

      if (statsResponse?.success) {
        setUserStats(statsResponse.stats);
      }
    } catch (error) {
      console.error(
        'Error loading admin data:',
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
          ...prev,
        ]);

        setActiveConversation(
          response.conversation
        );

        setActiveTab('copilot');
      }

      return response;
    } catch (error) {
      console.error(
        'Error creating conversation:',
        error
      );

      throw error;
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

        setActiveTab('copilot');
      }

      return response;
    } catch (error) {
      console.error(
        'Error loading conversation:',
        error
      );

      throw error;
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

      console.log(
        'Admin Dashboard sendMessage response:',
        response
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

      return response;
    } catch (error) {
      console.error(
        'Error sending message:',
        error
      );

      throw error;
    }
  };

  // ============================================================
  // SEND MESSAGE STREAMING
  // ============================================================

  const handleSendMessageStream = async (
    conversationId,
    data,
    onChunk,
    onComplete,
    onError
  ) => {
    try {
      await conversationAPI.sendMessageStream(
        conversationId,
        data,
        onChunk,
        onComplete,
        onError
      );
    } catch (error) {
      console.error(
        'Error in streaming message:',
        error
      );

      if (onError) {
        onError(error);
      }
    }
  };

  // ============================================================
  // EXECUTE ACTION
  // ============================================================

  const handleExecuteAction = async (
    conversationId,
    data
  ) => {
    try {
      const response =
        await conversationAPI.executeAction(
          conversationId,
          data
        );

      console.log(
        'Admin Dashboard executeAction response:',
        response
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

      return response;
    } catch (error) {
      console.error(
        'Error executing action:',
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

      throw error;
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

      return response;
    } catch (error) {
      console.error(
        'Error editing conversation:',
        error
      );

      throw error;
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
          ...prev,
        ]);
      }

      return response;
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

      throw error;
    }
  };

  // ============================================================
  // USER MANAGEMENT ACTIONS
  // ============================================================

  const handleUserAction = async (action, userId, data) => {
    try {
      let response;
      switch (action) {
        case 'block':
          response = await adminAPI.blockUser(userId);
          break;
        case 'unblock':
          response = await adminAPI.unblockUser(userId);
          break;
        case 'delete':
          response = await adminAPI.deleteUser(userId);
          break;
        default:
          throw new Error('Unknown action');
      }

      // Refresh user data after action
      if (response?.success) {
        const usersResponse = await adminAPI.getUsers();
        if (usersResponse?.success) {
          setAllUsers(
            Array.isArray(usersResponse.users)
              ? usersResponse.users
              : []
          );
        }

        const statsResponse = await adminAPI.getUserStats();
        if (statsResponse?.success) {
          setUserStats(statsResponse.stats);
        }
      }

      return response;
    } catch (error) {
      console.error('Error performing user action:', error);
      throw error;
    }
  };

  // ============================================================
  // NAVIGATION ITEMS
  // ============================================================

  const navigationItems = [
    {
      id: 'users',
      label: 'Users',
      icon: Users,
    },
    {
      id: 'valid-employee-ids',
      label: 'Valid Employee IDs',
      icon: Shield,
    },
    {
      id: 'copilot',
      label: 'Copilot',
      icon: MessageSquare,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
    },
    {
      id: 'gmail',
      label: 'Gmail',
      icon: Mail,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      id: 'leave',
      label: 'Leave',
      icon: Clock,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
    },
  ];

  // ============================================================
  // PAGE TITLE
  // ============================================================

  const getPageTitle = () => {
    switch (activeTab) {
      case 'users':
        return 'User Management';

      case 'valid-employee-ids':
        return 'Valid Employee IDs';

      case 'copilot':
        return 'Employee Copilot';

      case 'documents':
        return 'Documents';

      case 'gmail':
        return 'Gmail';

      case 'calendar':
        return 'Calendar';

      case 'leave':
        return 'Leave Management';

      case 'profile':
        return 'Profile';

      default:
        return 'Admin Dashboard';
    }
  };

  // ============================================================
  // PAGE DESCRIPTION
  // ============================================================

  const getPageDescription = () => {
    switch (activeTab) {
      case 'users':
        return 'Manage users, roles, and access';

      case 'valid-employee-ids':
        return 'Manage which Employee IDs are allowed to register';

      case 'copilot':
        return 'Your intelligent workplace assistant';

      case 'documents':
        return 'Manage company documents';

      case 'gmail':
        return 'Manage your Gmail inbox and emails';

      case 'calendar':
        return 'Manage your work calendar';

      case 'leave':
        return 'Manage employee leave';

      case 'profile':
        return 'Manage your account';

      default:
        return '';
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="flex flex-col items-center">

          <div className="relative">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Sparkles
                size={24}
                className="text-white"
              />
            </div>

            <div className="absolute -inset-1 rounded-2xl border-2 border-violet-200 animate-pulse" />

          </div>

          <p className="mt-5 text-sm font-medium text-gray-600">
            Loading Admin Dashboard...
          </p>

        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <div className="h-screen bg-[#f8f9fb] flex overflow-hidden text-gray-900">

      {/* ========================================================
          LEFT SIDEBAR
      ======================================================== */}

      <aside
        className={`
          hidden md:flex
          flex-col
          shrink-0
          bg-white
          border-r
          border-gray-200
          transition-all
          duration-300
          ${
            sidebarCollapsed
              ? 'w-[76px]'
              : 'w-[240px]'
          }
        `}
      >

        {/* ======================================================
            BRAND
        ====================================================== */}

        <div
          className={`
            h-[76px]
            flex
            items-center
            border-b
            border-gray-100
            ${
              sidebarCollapsed
                ? 'justify-center'
                : 'px-5 gap-3'
            }
          `}
        >

          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200">

            <Shield
              size={21}
              className="text-white"
            />

          </div>

          {!sidebarCollapsed && (
            <div className="min-w-0">

              <h1 className="font-bold text-[15px] text-gray-900 truncate">
                Admin Dashboard
              </h1>

              <p className="text-xs text-gray-500 truncate">
                Employee Copilot
              </p>

            </div>
          )}

        </div>

        {/* ======================================================
            NAVIGATION
        ====================================================== */}

        <nav className="flex-1 px-3 py-5 overflow-y-auto">

          {!sidebarCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Administration
            </p>
          )}

          <div className="space-y-1">

            {navigationItems.map(
              ({
                id,
                label,
                icon: Icon,
              }) => {

                const active =
                  activeTab === id;

                return (
                  <button
                    key={id}
                    onClick={() =>
                      setActiveTab(id)
                    }
                    title={
                      sidebarCollapsed
                        ? label
                        : undefined
                    }
                    className={`
                      w-full
                      flex
                      items-center
                      rounded-xl
                      transition-all
                      duration-200
                      group

                      ${
                        sidebarCollapsed
                          ? 'justify-center px-3 py-3'
                          : 'gap-3 px-3 py-2.5'
                      }

                      ${
                        active
                          ? 'bg-violet-50 text-violet-700 shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >

                    <Icon
                      size={19}
                      strokeWidth={
                        active ? 2.3 : 2
                      }
                      className={
                        active
                          ? 'text-violet-600'
                          : 'text-gray-500 group-hover:text-gray-700'
                      }
                    />

                    {!sidebarCollapsed && (
                      <span
                        className={`
                          text-sm
                          ${
                            active
                              ? 'font-semibold'
                              : 'font-medium'
                          }
                        `}
                      >
                        {label}
                      </span>
                    )}

                  </button>
                );
              }
            )}

          </div>

          {/* ====================================================
              QUICK ACTION
          ==================================================== */}

          <div className="mt-7">

            {!sidebarCollapsed && (
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Quick Action
              </p>
            )}

            <button
              onClick={handleCreateConversation}
              title={
                sidebarCollapsed
                  ? 'New chat'
                  : undefined
              }
              className={`
                w-full
                flex
                items-center
                rounded-xl
                border
                border-dashed
                border-gray-300
                text-gray-600
                hover:border-violet-300
                hover:bg-violet-50
                hover:text-violet-700
                transition-all

                ${
                  sidebarCollapsed
                    ? 'justify-center px-3 py-3'
                    : 'gap-3 px-3 py-2.5'
                }
              `}
            >

              <Plus size={18} />

              {!sidebarCollapsed && (
                <span className="text-sm font-medium">
                  New conversation
                </span>
              )}

            </button>

          </div>

        </nav>

        {/* ======================================================
            USER / LOGOUT
        ====================================================== */}

        <div className="border-t border-gray-100 p-3">

          <div
            className={`
              flex
              items-center
              ${
                sidebarCollapsed
                  ? 'justify-center'
                  : 'gap-3 px-2'
              }
            `}
          >

            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
              {(
                user?.name ||
                user?.email ||
                'A'
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">

                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user?.name || 'Admin'}
                </p>

                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'Admin'}
                </p>

              </div>
            )}

          </div>

          <button
            onClick={logout}
            title={
              sidebarCollapsed
                ? 'Logout'
                : undefined
            }
            className={`
              mt-3
              w-full
              flex
              items-center
              rounded-xl
              text-gray-500
              hover:bg-red-50
              hover:text-red-600
              transition

              ${
                sidebarCollapsed
                  ? 'justify-center px-3 py-2.5'
                  : 'gap-3 px-3 py-2.5'
              }
            `}
          >

            <LogOut size={18} />

            {!sidebarCollapsed && (
              <span className="text-sm font-medium">
                Logout
              </span>
            )}

          </button>

        </div>

        {/* ======================================================
            COLLAPSE BUTTON
        ====================================================== */}

        <div className="border-t border-gray-100 p-3">

          <button
            onClick={() =>
              setSidebarCollapsed(
                (prev) => !prev
              )
            }
            title={
              sidebarCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            className={`
              w-full
              flex
              items-center
              rounded-xl
              text-gray-500
              hover:bg-gray-50
              hover:text-gray-800
              transition

              ${
                sidebarCollapsed
                  ? 'justify-center px-3 py-2.5'
                  : 'gap-3 px-3 py-2.5'
              }
            `}
          >

            {sidebarCollapsed ? (
              <PanelLeft size={18} />
            ) : (
              <>
                <PanelLeftClose size={18} />

                <span className="text-sm font-medium">
                  Collapse sidebar
                </span>
              </>
            )}

          </button>

        </div>

      </aside>

      {/* ========================================================
          MAIN APPLICATION
      ======================================================== */}

      <div className="flex-1 min-w-0 flex flex-col">

        {/* ======================================================
            TOP HEADER
        ====================================================== */}

        <header className="h-[76px] shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-5 lg:px-7">

          <div className="flex items-center gap-3">

            {/* Mobile brand */}

            <div className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">

              <Shield
                size={18}
                className="text-white"
              />

            </div>

            <div>
              <h1 className="text-[17px] font-semibold text-gray-900">
                {getPageTitle()}
              </h1>

              <p className="text-xs text-gray-500">
                {getPageDescription()}
              </p>
            </div>

          </div>

          {/* Header actions */}

          <div className="flex items-center gap-3">

            {userStats && activeTab === 'users' && (
              <div className="hidden sm:flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-sm font-semibold text-gray-900">{userStats.total_users}</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-xs text-gray-500">Employees</p>
                  <p className="text-sm font-semibold text-gray-900">{userStats.employees}</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-xs text-gray-500">HR</p>
                  <p className="text-sm font-semibold text-gray-900">{userStats.hr_users}</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-xs text-gray-500">Blocked</p>
                  <p className="text-sm font-semibold text-red-600">{userStats.blocked_users}</p>
                </div>
              </div>
            )}

          </div>

        </header>

        {/* ======================================================
            MAIN CONTENT AREA
        ====================================================== */}

        <main className="flex-1 overflow-hidden">
          {activeTab === 'users' && (
            <UserManagement
              users={allUsers}
              onUserAction={handleUserAction}
              onRefresh={loadData}
              currentUserId={user?.id}
            />
          )}

          {activeTab === 'valid-employee-ids' && (
            <ValidEmployeeIds />
          )}

          {activeTab === 'copilot' && (
            <Copilot
              conversations={conversations}
              activeConversation={activeConversation}
              onCreateConversation={handleCreateConversation}
              onSelectConversation={handleSelectConversation}
              onSendMessage={handleSendMessage}
              onSendMessageStream={handleSendMessageStream}
              onExecuteAction={handleExecuteAction}
              onDeleteConversation={handleDeleteConversation}
              onEditConversation={handleEditConversation}
            />
          )}

          {activeTab === 'documents' && (
            <Documents
              documents={documents}
              onUploadDocument={handleUploadDocument}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'gmail' && (
            <Gmail />
          )}

          {activeTab === 'calendar' && (
            <EmployeeCalendar />
          )}

          {activeTab === 'leave' && (
            <LeaveManagement />
          )}

          {activeTab === 'profile' && (
            <Profile />
          )}
        </main>

      </div>

    </div>
  );
};

export default AdminDashboard;