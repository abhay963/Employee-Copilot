import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Calendar,
  User,
  Clock,
  Mail,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { conversationAPI } from '../services/api';

import Copilot from '../components/Copilot';
import ConversationList from '../components/ConversationList';
import LeaveManagement from '../components/LeaveManagement';
import Profile from '../components/Profile';
import EmployeeCalendar from '../components/EmployeeCalendar';
import Gmail from '../components/Gmail';

const EmployeeDashboard = () => {
  const { user, isEmployee, logout } = useUser();

  const [activeTab, setActiveTab] = useState('copilot');

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  // ============================================================
  // LOAD EMPLOYEE DATA
  // ============================================================

  useEffect(() => {
    if (isEmployee) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isEmployee]);

  const loadData = async () => {
    try {
      setLoading(true);

      const response =
        await conversationAPI.getConversations();

      if (
        response?.success &&
        Array.isArray(response.conversations)
      ) {
        setConversations(response.conversations);
      }
    } catch (error) {
      console.error(
        'Error loading employee data:',
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
        'Employee Dashboard sendMessage response:',
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
        'Employee Dashboard executeAction response:',
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
  // NAVIGATION ITEMS
  // ============================================================

  const navigationItems = [
    {
      id: 'copilot',
      label: 'Copilot',
      icon: MessageSquare,
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
  // PAGE TITLES
  // ============================================================

  const pageTitles = {
    copilot: {
      title: 'Employee Copilot',
      description:
        'Your intelligent workplace assistant',
    },

    gmail: {
      title: 'Gmail',
      description:
        'Read and send emails from your Google account',
    },

    calendar: {
      title: 'Calendar',
      description:
        'Manage your work calendar',
    },

    leave: {
      title: 'Leave Management',
      description:
        'Manage your leave requests',
    },

    profile: {
      title: 'Profile',
      description:
        'Manage your account',
    },
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
            Loading Employee Copilot...
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

        {/* ------------------------------------------------------
            BRAND
        ------------------------------------------------------ */}

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
            <LayoutDashboard
              size={21}
              className="text-white"
            />
          </div>

          {!sidebarCollapsed && (
            <div className="min-w-0">

              <h1 className="font-bold text-[15px] text-gray-900 truncate">
                Employee Copilot
              </h1>

              <p className="text-xs text-gray-500 truncate">
                Your workspace
              </p>

            </div>
          )}

        </div>

        {/* ------------------------------------------------------
            NAVIGATION
        ------------------------------------------------------ */}

        <nav className="flex-1 px-3 py-5 overflow-y-auto">

          {!sidebarCollapsed && (
            <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
              Workspace
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

          {/* ----------------------------------------------------
              NEW CHAT
          ---------------------------------------------------- */}

          <div className="mt-7">

            {!sidebarCollapsed && (
              <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Quick Action
              </p>
            )}

            <button
              onClick={
                handleCreateConversation
              }
              title={
                sidebarCollapsed
                  ? 'New conversation'
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

        {/* ------------------------------------------------------
            USER / LOGOUT
        ------------------------------------------------------ */}

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
                'E'
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">

                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user?.name || 'Employee'}
                </p>

                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'Employee'}
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

        {/* ------------------------------------------------------
            COLLAPSE BUTTON
        ------------------------------------------------------ */}

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

              <Sparkles
                size={18}
                className="text-white"
              />

            </div>

            <div>

              <h2 className="text-[17px] font-semibold text-gray-900">
                {pageTitles[activeTab]?.title}
              </h2>

              <p className="hidden sm:block text-xs text-gray-500 mt-0.5">
                {pageTitles[activeTab]?.description}
              </p>

            </div>

          </div>

          {/* Header status */}

          <div className="flex items-center gap-3">

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">

              <span className="w-2 h-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-medium text-gray-600">
                Copilot ready
              </span>

            </div>

          </div>

        </header>

        {/* ======================================================
            MOBILE NAVIGATION
        ====================================================== */}

        <div className="md:hidden shrink-0 bg-white border-b border-gray-200 overflow-x-auto">

          <div className="flex items-center gap-1 p-2 min-w-max">

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
                    className={`
                      flex
                      items-center
                      gap-2
                      px-3
                      py-2
                      rounded-lg
                      text-xs
                      font-medium
                      whitespace-nowrap
                      transition

                      ${
                        active
                          ? 'bg-violet-50 text-violet-700'
                          : 'text-gray-500 hover:bg-gray-50'
                      }
                    `}
                  >

                    <Icon size={16} />

                    {label}

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* ======================================================
            PAGE CONTENT
        ====================================================== */}

        <main className="flex-1 min-h-0 overflow-hidden">

          {/* ====================================================
              COPILOT
          ==================================================== */}

          {activeTab === 'copilot' && (
            <div className="h-full flex min-w-0">

              {/* ==================================================
                  CHATGPT STYLE CONVERSATION SIDEBAR
              ================================================== */}

              <section className="hidden sm:flex w-[280px] lg:w-[310px] shrink-0 bg-[#f7f7f8] border-r border-gray-200 flex-col">

                {/* Conversation header */}

                <div className="px-4 pt-4 pb-3">

                  <button
                    onClick={
                      handleCreateConversation
                    }
                    className="
                      w-full
                      flex
                      items-center
                      justify-center
                      gap-2
                      px-4
                      py-2.5
                      rounded-xl
                      bg-white
                      border
                      border-gray-200
                      shadow-sm
                      text-sm
                      font-medium
                      text-gray-700
                      hover:border-violet-300
                      hover:text-violet-700
                      hover:bg-violet-50
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

              </section>

              {/* ==================================================
                  CHAT AREA
              ================================================== */}

              <section className="flex-1 min-w-0 min-h-0 bg-white">

                <div className="h-full w-full">

                  <Copilot
                    conversation={
                      activeConversation
                    }
                    onSendMessage={
                      handleSendMessage
                    }
                    onSendMessageStream={
                      handleSendMessageStream
                    }
                    onExecuteAction={
                      handleExecuteAction
                    }
                    onDeleteConversation={
                      handleDeleteConversation
                    }
                  />

                </div>

              </section>

            </div>
          )}

          {/* ====================================================
              GMAIL
          ==================================================== */}

          {activeTab === 'gmail' && (
            <div className="h-full overflow-y-auto p-4 lg:p-7">

              <div className="max-w-[1500px] mx-auto h-full">

                <Gmail />

              </div>

            </div>
          )}

          {/* ====================================================
              CALENDAR
          ==================================================== */}

          {activeTab === 'calendar' && (
            <div className="h-full overflow-y-auto p-4 lg:p-7">

              <div className="max-w-[1500px] mx-auto h-full">

                <EmployeeCalendar />

              </div>

            </div>
          )}

          {/* ====================================================
              LEAVE
          ==================================================== */}

          {activeTab === 'leave' && (
            <div className="h-full overflow-y-auto p-4 lg:p-7">

              <div className="max-w-7xl mx-auto">

                <LeaveManagement
                  isHR={false}
                />

              </div>

            </div>
          )}

          {/* ====================================================
              PROFILE
          ==================================================== */}

          {activeTab === 'profile' && (
            <div className="h-full overflow-y-auto p-4 lg:p-7">

              <div className="max-w-5xl mx-auto">

                <Profile />

              </div>

            </div>
          )}

        </main>

      </div>

    </div>
  );
};

export default EmployeeDashboard;