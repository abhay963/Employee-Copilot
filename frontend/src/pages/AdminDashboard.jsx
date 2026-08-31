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
import ThemeToggle from '../components/ThemeToggle';
import ValidEmployeeIds from '../components/ValidEmployeeIds';

const AdminDashboard = () => {
  const { user, isAdmin, logout } = useUser();

  const [activeTab, setActiveTab] = useState('users');
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Generate DiceBear avatar URL
  const avatarSeed = user?.uid || user?.email || "guest";
  const avatarUrl = `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=09090b,18181b,1e1b4b,312e81&radius=22`;

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
        case 'changeRole':
          response = await adminAPI.changeUserRole(userId, data);
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
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center">

          <div className="relative">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
              <Sparkles
                size={24}
                className="text-white"
              />
            </div>

            <div className="absolute -inset-1 rounded-2xl border-2 border-violet-200 dark:border-violet-700 animate-pulse" />

          </div>

          <p className="mt-5 text-sm font-medium text-secondary">
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
    <div className="h-screen bg-background flex overflow-hidden text-primary transition-colors duration-300">

      {/* ========================================================
          LEFT SIDEBAR
      ======================================================== */}

      <aside
        className={`
          hidden md:flex
          flex-col
          shrink-0
          sidebar
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
            border-b border-light
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

              <h1 className="font-bold text-[15px] text-primary truncate">
                Admin Dashboard
              </h1>

              <p className="text-xs text-secondary truncate">
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
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-tertiary">
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
                          ? 'sidebar-item active'
                          : 'sidebar-item'
                      }
                    `}
                  >

                    <Icon
                      size={19}
                      strokeWidth={
                        active ? 2.3 : 2
                      }
                      className="current-color"
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
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-tertiary">
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
                border-dashed border-default
                text-secondary
                hover:border-violet-400
                hover:bg-violet-50 dark:hover:bg-violet-900/20
                hover:text-violet-600 dark:hover:text-violet-400
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

        <div className="border-t border-light p-3">

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

            {avatarLoadError ? (
              <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                {(
                  user?.name ||
                  user?.email ||
                  'A'
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            ) : (
              <img
                src={avatarUrl}
                alt={`${user?.name || "User"} avatar`}
                className="w-9 h-9 shrink-0 rounded-full object-cover"
                onError={() => setAvatarLoadError(true)}
              />
            )}

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">

                <p className="text-sm font-semibold text-primary truncate">
                  {user?.name || 'Admin'}
                </p>

                <p className="text-xs text-secondary truncate">
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
              text-tertiary
              hover:bg-red-50 dark:hover:bg-red-900/20
              hover:text-red-600 dark:hover:text-red-400
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

        <div className="border-t border-light p-3">

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
              text-tertiary
              hover:bg-surface-alt
              hover:text-primary
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

        <header className="h-[76px] shrink-0 header flex items-center justify-between px-5 lg:px-7 transition-colors duration-300">

          <div className="flex items-center gap-3">

            {/* Mobile brand */}

            <div className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">

              <Shield
                size={18}
                className="text-white"
              />

            </div>

            <div>
              <h1 className="text-[17px] font-semibold text-primary">
                {getPageTitle()}
              </h1>

              <p className="text-xs text-secondary">
                {getPageDescription()}
              </p>
            </div>

          </div>

          {/* Header actions */}

          <div className="flex items-center gap-3">

            {userStats && activeTab === 'users' && (
              <div className="hidden sm:flex items-center gap-4 bg-surface-tertiary rounded-lg px-4 py-2">
                <div className="text-center">
                  <p className="text-xs text-tertiary">Total</p>
                  <p className="text-sm font-semibold text-primary">{userStats.total_users}</p>
                </div>
                <div className="w-px h-8 bg-border-medium" />
                <div className="text-center">
                  <p className="text-xs text-tertiary">Employees</p>
                  <p className="text-sm font-semibold text-primary">{userStats.employees}</p>
                </div>
                <div className="w-px h-8 bg-border-medium" />
                <div className="text-center">
                  <p className="text-xs text-tertiary">HR</p>
                  <p className="text-sm font-semibold text-primary">{userStats.hr_users}</p>
                </div>
                <div className="w-px h-8 bg-border-medium" />
                <div className="text-center">
                  <p className="text-xs text-tertiary">Blocked</p>
                  <p className="text-sm font-semibold text-danger">{userStats.blocked_users}</p>
                </div>
              </div>
            )}

            <ThemeToggle />

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger-light text-danger hover:bg-danger transition-colors text-sm font-medium"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>

          </div>

        </header>

        {/* ======================================================
            MAIN CONTENT AREA
        ====================================================== */}

        <main className="flex-1 overflow-y-auto">
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
            <div className="h-full flex min-w-0">

              {/* ==================================================
                  CHATGPT STYLE CONVERSATION SIDEBAR
              ================================================== */}

              <section className="hidden sm:flex w-[280px] lg:w-[310px] shrink-0 conversation-sidebar flex-col transition-colors duration-300">

                {/* Conversation header */}

                <div className="px-4 pt-4 pb-3">

                  <button
                    onClick={handleCreateConversation}
                    className="
                      w-full
                      flex
                      items-center
                      justify-center
                      gap-2
                      px-4
                      py-2.5
                      rounded-xl
                      new-conversation-btn
                      shadow-sm
                      text-sm
                      font-medium
                      transition-all
                    "
                  >

                    <Plus size={17} />

                    New conversation

                  </button>

                </div>

                {/* Conversation list */}

                <div className="flex-1 min-h-0 overflow-hidden px-2 pb-3">

                  <ConversationList
                    conversations={conversations}
                    activeConversation={activeConversation}
                    onSelect={handleSelectConversation}
                    onCreate={handleCreateConversation}
                    onDelete={handleDeleteConversation}
                    onEdit={handleEditConversation}
                  />

                </div>

              </section>

              {/* ==================================================
                  CHAT AREA
              ================================================== */}

              <section className="flex-1 min-w-0 min-h-0 bg-surface transition-colors duration-300">

                <div className="h-full w-full">

                  <Copilot
                    conversation={activeConversation}
                    onSendMessage={handleSendMessage}
                    onSendMessageStream={handleSendMessageStream}
                    onExecuteAction={handleExecuteAction}
                    onDeleteConversation={handleDeleteConversation}
                  />

                </div>

              </section>

            </div>
          )}

          {activeTab === 'documents' && (
            <div className="h-full overflow-y-auto p-4 lg:p-7">
              <div className="max-w-7xl mx-auto h-full">
                <Documents
                  documents={documents}
                  onUpload={handleUploadDocument}
                  onDelete={handleDeleteDocument}
                  onView={handleViewDocument}
                  isHR={true}
                />
              </div>
            </div>
          )}

          {activeTab === 'gmail' && (
            <Gmail />
          )}

          {activeTab === 'calendar' && (
            <EmployeeCalendar />
          )}

          {activeTab === 'leave' && (
            <div className="h-full overflow-y-auto p-4 lg:p-7">
              <div className="max-w-7xl mx-auto">
                <LeaveManagement isAdmin={true} />
              </div>
            </div>
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