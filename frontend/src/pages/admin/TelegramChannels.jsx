import { useState, useEffect } from 'react';
import { Send, Plus, Trash2, Edit2, Check, X, TestTube, Radio, Users, Clock, RefreshCw } from 'lucide-react';
import api from '../../services/api';

export default function TelegramChannels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [testing, setTesting] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const response = await api.request('/admin/telegram/channels');
      setChannels(response.channels || []);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const addChannel = async (data) => {
    try {
      await api.request('/admin/telegram/channels', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      loadChannels();
      setShowAddModal(false);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const updateChannel = async (id, data) => {
    try {
      await api.request(`/admin/telegram/channels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      loadChannels();
      setEditingChannel(null);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const deleteChannel = async (id) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    try {
      await api.request(`/admin/telegram/channels/${id}`, { method: 'DELETE' });
      loadChannels();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const testChannel = async (id) => {
    setTesting(id);
    try {
      const response = await api.request(`/admin/telegram/channels/${id}/test`, { method: 'POST' });
      alert(response.message || 'Test message sent!');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setTesting(null);
    }
  };

  const toggleActive = async (channel) => {
    await updateChannel(channel.id, { is_active: channel.is_active ? 0 : 1 });
  };

  const activeCount = channels.filter(c => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Send className="text-cyan-400" />
            Telegram Channels
          </h1>
          <p className="text-midnight-400 mt-1">Manage channels and groups for deal broadcasting</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadChannels}
            className="px-4 py-2 bg-midnight-700 text-white rounded-lg hover:bg-midnight-600 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Channel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
          <div className="text-3xl font-bold text-white">{channels.length}</div>
          <div className="text-midnight-400 text-sm">Total Channels</div>
        </div>
        <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
          <div className="text-3xl font-bold text-green-400">{activeCount}</div>
          <div className="text-midnight-400 text-sm">Active Channels</div>
        </div>
        <div className="bg-midnight-800 rounded-xl p-4 border border-midnight-700">
          <div className="text-3xl font-bold text-cyan-400">
            {channels.reduce((sum, c) => sum + (c.post_count || 0), 0)}
          </div>
          <div className="text-midnight-400 text-sm">Total Posts</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-3">📋 How to Add a Channel</h3>
        <ol className="text-midnight-300 space-y-2 list-decimal list-inside">
          <li>Add the bot <code className="bg-midnight-800 px-2 py-1 rounded">@dealsluxy_deals_bot</code> as <b>Admin</b> to your channel/group</li>
          <li>Click "Add Channel" and enter the channel username (e.g., <code className="bg-midnight-800 px-2 py-1 rounded">@deals_channel</code>)</li>
          <li>For private groups, use the numeric ID (e.g., <code className="bg-midnight-800 px-2 py-1 rounded">-1001234567890</code>)</li>
          <li>Click "Test" to verify the connection</li>
        </ol>
      </div>

      {/* Channels List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-midnight-800 rounded-xl p-4 animate-pulse">
              <div className="h-6 bg-midnight-700 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-midnight-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="text-center py-20 bg-midnight-800 rounded-xl border border-midnight-700">
          <div className="text-6xl mb-4">📢</div>
          <h3 className="text-xl font-semibold mb-2 text-white">No channels yet</h3>
          <p className="text-midnight-400 mb-4">Add your first Telegram channel to start broadcasting deals!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700"
          >
            <Plus size={18} />
            Add Channel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {channels.map(channel => (
            <div 
              key={channel.id} 
              className={`bg-midnight-800 rounded-xl p-4 border transition-colors ${
                channel.is_active ? 'border-cyan-500/50' : 'border-midnight-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    channel.is_active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-midnight-700 text-midnight-500'
                  }`}>
                    <Send size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">{channel.name}</h3>
                    <p className="text-midnight-400 text-sm font-mono">{channel.channel_id}</p>
                    {channel.description && (
                      <p className="text-midnight-500 text-sm mt-1">{channel.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {/* Stats */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-midnight-400 text-sm">
                      <Radio size={14} />
                      <span>{channel.post_count || 0} posts</span>
                    </div>
                    {channel.last_post_at && (
                      <div className="flex items-center gap-1 text-midnight-500 text-xs mt-1">
                        <Clock size={12} />
                        <span>{new Date(channel.last_post_at).toLocaleDateString('he-IL')}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => testChannel(channel.id)}
                      disabled={testing === channel.id}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      title="Send test message"
                    >
                      {testing === channel.id ? <RefreshCw size={18} className="animate-spin" /> : <TestTube size={18} />}
                    </button>
                    <button
                      onClick={() => toggleActive(channel)}
                      className={`p-2 rounded-lg ${
                        channel.is_active 
                          ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
                          : 'bg-midnight-700 text-midnight-400 hover:bg-midnight-600'
                      }`}
                      title={channel.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {channel.is_active ? <Check size={18} /> : <X size={18} />}
                    </button>
                    <button
                      onClick={() => setEditingChannel(channel)}
                      className="p-2 bg-midnight-700 text-white rounded-lg hover:bg-midnight-600"
                      title="Edit"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteChannel(channel.id)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <ChannelModal
          onClose={() => setShowAddModal(false)}
          onSave={addChannel}
        />
      )}

      {/* Edit Modal */}
      {editingChannel && (
        <ChannelModal
          channel={editingChannel}
          onClose={() => setEditingChannel(null)}
          onSave={(data) => updateChannel(editingChannel.id, data)}
        />
      )}
    </div>
  );
}

function ChannelModal({ channel, onClose, onSave }) {
  const [name, setName] = useState(channel?.name || '');
  const [channelId, setChannelId] = useState(channel?.channel_id || '');
  const [description, setDescription] = useState(channel?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !channelId) {
      alert('Name and Channel ID are required');
      return;
    }
    setSaving(true);
    await onSave({ name, channel_id: channelId, description });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-midnight-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-midnight-700" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Send className="text-cyan-400" />
          {channel ? 'Edit Channel' : 'Add Channel'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-midnight-900 border border-midnight-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g., Deals Group Israel"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Channel/Group ID</label>
            <input
              type="text"
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              className="w-full bg-midnight-900 border border-midnight-700 rounded-lg px-4 py-3 text-white font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="@channel_name or -1001234567890"
              required
            />
            <p className="text-midnight-500 text-xs mt-1">
              Use @username for public channels or numeric ID for private groups
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-midnight-300 mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-midnight-900 border border-midnight-700 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g., 50k members, tech deals"
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-midnight-600 text-midnight-300 rounded-lg hover:bg-midnight-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
              {channel ? 'Update' : 'Add Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

