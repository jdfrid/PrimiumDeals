import { useState, useEffect } from 'react';
import { Mail, Trash2, Check, Clock, User, MessageSquare } from 'lucide-react';
import api from '../../services/api';

export default function MessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await api.request('/admin/messages');
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.request(`/admin/messages/${id}/read`, { method: 'PATCH' });
      setMessages(messages.map(m => m.id === id ? { ...m, is_read: 1 } : m));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const deleteMessage = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.request(`/admin/messages/${id}`, { method: 'DELETE' });
      setMessages(messages.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            Contact Messages
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-midnight-400">Messages from the contact form</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1 glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-midnight-700">
            <h3 className="font-medium">Inbox ({messages.length})</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-midnight-400 text-center py-8">No messages yet</p>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (!msg.is_read) markAsRead(msg.id);
                  }}
                  className={`p-4 border-b border-midnight-800 cursor-pointer hover:bg-midnight-800/50 transition-colors ${
                    selectedMessage?.id === msg.id ? 'bg-midnight-800' : ''
                  } ${!msg.is_read ? 'border-l-4 border-l-gold-400' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`font-medium truncate ${!msg.is_read ? 'text-white' : 'text-midnight-300'}`}>
                      {msg.name}
                    </span>
                    <span className="text-xs text-midnight-500 whitespace-nowrap">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-midnight-400 truncate">{msg.subject}</p>
                  <p className="text-xs text-midnight-500 truncate mt-1">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-2 glass rounded-xl">
          {selectedMessage ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1">{selectedMessage.subject || 'No Subject'}</h2>
                  <div className="flex items-center gap-4 text-sm text-midnight-400">
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {selectedMessage.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail size={14} />
                      <a href={`mailto:${selectedMessage.email}`} className="text-gold-400 hover:underline">
                        {selectedMessage.email}
                      </a>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedMessage.is_read && (
                    <button
                      onClick={() => markAsRead(selectedMessage.id)}
                      className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-green-400"
                      title="Mark as read"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-midnight-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="bg-midnight-800/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              
              <div className="mt-4 pt-4 border-t border-midnight-700">
                <p className="text-xs text-midnight-500">
                  IP: {selectedMessage.ip_address}
                </p>
              </div>
              
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || 'Your message'}`}
                className="mt-4 btn-gold inline-flex items-center gap-2"
              >
                <Mail size={16} />
                Reply via Email
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-midnight-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
                <p>Select a message to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

