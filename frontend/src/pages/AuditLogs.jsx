import React, { useEffect, useState } from 'react'
import { auditAPI } from '../services/api.js'
import { ScrollText, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const ACTION_COLORS = {
  LOGIN:'text-green-400', LOGIN_FAILURE:'text-red-400',
  CREATE_DISASTER:'text-blue-400', UPDATE_DISASTER:'text-yellow-400', DELETE_DISASTER:'text-red-400',
  CREATE_AREA:'text-blue-400', CREATE_RESOURCE:'text-blue-400',
  STOCK_INCREASE:'text-green-400', STOCK_DECREASE:'text-orange-400',
  OPTIMIZE_ALLOCATION:'text-purple-400', APPROVE_ALLOCATION:'text-green-400',
  REJECT_ALLOCATION:'text-red-400', PREDICT_REQUIREMENTS:'text-purple-400',
  RUN_SIMULATION:'text-cyan-400',
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await auditAPI.list(200); setLogs(data) }
    catch { toast.error('Failed to load audit logs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><ScrollText size={22} /> Audit Logs</h1>
          <p className="page-sub">{logs.length} entries · Admin only</p>
        </div>
        <button className="btn-ghost" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {loading ? <div className="text-center py-16 text-slate-500">Loading…</div> :
        logs.length === 0 ? <div className="text-center py-16 text-slate-500">No logs yet.</div> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="tbl">
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="text-slate-500 text-xs whitespace-nowrap">{l.created_at?.slice(0,19).replace('T',' ')}</td>
                    <td className="text-slate-400 text-xs">{l.user_email}</td>
                    <td>
                      <span className={`text-xs font-mono font-medium ${ACTION_COLORS[l.action]||'text-slate-400'}`}>{l.action}</span>
                    </td>
                    <td className="text-slate-500 text-xs">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
                    <td className="text-slate-600 text-xs max-w-xs truncate">{l.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}
