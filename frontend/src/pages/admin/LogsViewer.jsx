import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../services/api';

export default function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => { setLoading(true); try { setLogs(await api.getLogs()); } catch (e) { console.error(e); } finally { setLoading(false); } };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold mb-1">Query Logs</h1><p className="text-midnight-400">History of eBay API query executions</p></div>
        <button onClick={loadLogs} disabled={loading} className="btn-outline flex items-center gap-2"><RefreshCw size={18} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      <div className="glass rounded-xl overflow-hidden">
        <table className="table-dark">
          <thead><tr><th>Status</th><th>Rule</th><th>Found</th><th>Added</th><th>Time</th><th>Error</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan="6"><div className="h-12 shimmer rounded" /></td></tr>) : logs.length === 0 ? <tr><td colSpan="6" className="text-center py-12 text-midnight-400">No logs yet</td></tr> : logs.map(log => (
              <tr key={log.id}>
                <td><span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{log.status === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}{log.status}</span></td>
                <td><span className="font-medium">{log.rule_name || `Rule #${log.rule_id}`}</span></td>
                <td><span className="text-gold-400 font-semibold">{log.items_found}</span></td>
                <td><span className="text-green-400 font-semibold">{log.items_added}</span></td>
                <td><span className="text-midnight-400 text-sm flex items-center gap-1"><Clock size={12} />{new Date(log.created_at).toLocaleString()}</span></td>
                <td>{log.error_message ? <span className="text-red-400 text-sm truncate max-w-xs block">{log.error_message}</span> : <span className="text-midnight-500">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


