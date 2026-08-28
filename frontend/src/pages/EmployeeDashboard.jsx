
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Calendar,
  User,
  Clock
} from 'lucide-react';

import { useUser } from '../context/UserContext';
import { conversationAPI } from '../services/api';

import Copilot from '../components/Copilot';
import ConversationList from '../components/ConversationList';
import LeaveManagement from '../components/LeaveManagement';
import Profile from '../components/Profile';
import EmployeeCalendar from '../components/EmployeeCalendar';

const EmployeeDashboard = () => {
  const { user, isEmployee, logout } = useUser();

  const [activeTab, setActiveTab] = useState('copilot');

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] =
    useState(null);

  const [loading, setLoading] = useState(true);

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

      // Employees only load their conversations.
      // They do NOT load or manage company documents.

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
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />

          <p className="mt-4 text-gray-600">
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
    <div className="min-h-screen bg-gray-50">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="bg-white border-b border-gray-200">

        <div className="max-w-7xl mx-auto px-4 py-4">

          <div className="flex items-center justify-between">

            {/* BRAND */}

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">

                <LayoutDashboard
                  size={22}
                  className="text-blue-600"
                />

              </div>

              <div>

                <h1 className="text-xl font-bold text-gray-900">
                  Employee Copilot
                </h1>

                <p className="text-sm text-gray-600">
                  Welcome, {user?.name || 'Employee'}
                </p>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="flex items-center gap-2">

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

        </div>

      </header>

      {/* ======================================================
          NAVIGATION

          Employee has:
          - Copilot
          - Calendar
          - Leave
          - Profile

          Employee does NOT have:
          - Documents
          - Upload
      ====================================================== */}

      <div className="bg-white border-b border-gray-200">

        <div className="max-w-7xl mx-auto px-4">

          <div className="flex gap-4 overflow-x-auto">

            {/* =================================================
                COPILOT
            ================================================= */}

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
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >

              <MessageSquare size={18} />

              Copilot

            </button>

            {/* =================================================
                CALENDAR
            ================================================= */}

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
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >

              <Calendar size={18} />

              Calendar

            </button>

            {/* =================================================
                LEAVE
            ================================================= */}

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
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >

              <Clock size={18} />

              Leave

            </button>

            {/* =================================================
                PROFILE
            ================================================= */}

            <button
              onClick={() =>
                setActiveTab('profile')
              }
              className={`
                flex items-center gap-2
                px-4 py-3
                font-medium
                whitespace-nowrap
                transition-colors
                ${
                  activeTab === 'profile'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >

              <User size={18} />

              Profile

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

            {/* CONVERSATION LIST */}

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

            {/* COPILOT */}

            <div className="lg:col-span-3 min-h-0">

              <Copilot
                conversation={
                  activeConversation
                }
                onSendMessage={
                  handleSendMessage
                }
                onExecuteAction={
                  handleExecuteAction
                }
                onDeleteConversation={
                  handleDeleteConversation
                }
              />

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

          <div className="min-h-[calc(100vh-200px)]">

            <LeaveManagement
              isHR={false}
            />

          </div>

        )}

        {/* ====================================================
            PROFILE
        ==================================================== */}

        {activeTab === 'profile' && (

          <div className="min-h-[calc(100vh-200px)]">

            <Profile />

          </div>

        )}

      </main>

    </div>
  );
};

export default EmployeeDashboard;
