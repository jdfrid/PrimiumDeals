import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, Shield, Eye } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

function UserModal({ userData, onClose, onSave }) {
  const [form, setForm] = useState({ name: userData?.name || '', email: userData?.email || '', password: '', role: userData?.role || 'viewer' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (userData) await api.updateUser(userData.id, payload);
      else await api.createUser(payload);
      onSave();
    } catch (error) { alert(error.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{userData ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-midnight-700 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">Name</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input-dark w-full" /></div>
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="input-dark w-full" /></div>
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">{userData ? 'New Password (optional)' : 'Password'}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!userData} className="input-dark w-full" /></div>
          <div><label className="block text-sm font-medium text-midnight-300 mb-2">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-dark w-full"><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select></div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-gold flex-1 flex items-center justify-center gap-2">{loading ? <div className="w-5 h-5 border-2 border-midnight-950 border-t-transparent rounded-full animate-spin" /> : <><Save size={18} />Save</>}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const roleColors = { admin: 'bg-red-500/20 text-red-400', editor: 'bg-blue-500/20 text-blue-400', viewer: 'bg-gray-500/20 text-gray-400' };

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => { try { setUsers(await api.getUsers()); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const deleteUser = async (id) => { if (confirm('Delete this user?')) { try { await api.deleteUser(id); loadUsers(); } catch (e) { alert(e.message); } } };
  const openModal = (user = null) => { setEditingUser(user); setShowModal(true); };
  const closeModal = () => { setEditingUser(null); setShowModal(false); };
  const handleSave = () => { closeModal(); loadUsers(); };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold mb-1">Team Members</h1><p className="text-midnight-400">Manage user access and permissions</p></div>
        <button onClick={() => openModal()} className="btn-gold flex items-center gap-2"><Plus size={18} />Add User</button>
      </div>
      <div className="glass rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead><tr><th>User</th><th>Role</th><th>Joined</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(3)].map((_, i) => <tr key={i}><td colSpan="4"><div className="h-16 shimmer rounded" /></td></tr>) : users.length === 0 ? <tr><td colSpan="4" className="text-center py-12 text-midnight-400">No users</td></tr> : users.map(user => (
              <tr key={user.id}>
                <td><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-midnight-700 flex items-center justify-center"><span className="text-gold-400 font-semibold">{user.name?.charAt(0).toUpperCase()}</span></div><div><p className="font-medium">{user.name}</p><p className="text-sm text-midnight-400">{user.email}</p></div></div></td>
                <td><span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium capitalize ${roleColors[user.role]}`}>{user.role === 'admin' ? <Shield size={12} /> : <Eye size={12} />}{user.role}</span></td>
                <td><span className="text-midnight-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</span></td>
                <td><div className="flex items-center justify-end gap-2"><button onClick={() => openModal(user)} className="p-2 rounded-lg hover:bg-midnight-700 text-midnight-400 hover:text-white transition-colors"><Edit size={16} /></button>{user.id !== currentUser?.id && <button onClick={() => deleteUser(user.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-midnight-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <UserModal userData={editingUser} onClose={closeModal} onSave={handleSave} />}
    </div>
  );
}

