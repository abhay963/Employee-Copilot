import { useState } from 'react';
import { MessageSquare, Plus, Trash2, Edit2, X } from 'lucide-react';
import { conversationAPI } from '../services/api';

const ConversationItem = ({ conversation, isActive, onSelect, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);

  const handleEdit = async () => {
    try {
      await onEdit(conversation.id, { title: editedTitle });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to edit title:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this conversation?')) {
      try {
        await onDelete(conversation.id);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
      }`}
      onClick={() => !isEditing && onSelect(conversation)}
    >
      <div className="flex items-start justify-between">
        {isEditing ? (
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="p-1 hover:bg-green-100 rounded"
            >
              <Edit2 size={14} className="text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(false);
                setEditedTitle(conversation.title);
              }}
              className="p-1 hover:bg-red-100 rounded"
            >
              <X size={14} className="text-red-600" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{conversation.title}</h4>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(conversation.updated_at)}
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Edit2 size={14} className="text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="p-1 hover:bg-red-100 rounded"
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ConversationList = ({ conversations, activeConversation, onSelect, onCreate, onDelete, onEdit }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <button
            onClick={onCreate}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            title="New conversation"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={activeConversation?.id === conversation.id}
                onSelect={onSelect}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            <MessageSquare size={48} className="mx-auto mb-4" />
            <p>No conversations yet</p>
            <button
              onClick={onCreate}
              className="mt-2 text-blue-500 hover:text-blue-600 text-sm"
            >
              Start your first conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
