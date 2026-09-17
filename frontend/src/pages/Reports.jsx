import React, { useEffect, useState } from 'react'
import { disasterAPI, reportAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { FileText, Download } from 'lucide-react'

const SEV_BADGE = { Critical:'badge-red', High:'badge-orange', Moderate:'badge-yellow', Low:'badge-green' }
const ST_BADGE  = { Active:'badge-green', Monitoring:'badge-blue', Resolved:'badge-slate' }

export default function Reports() {
  const [disasters, setDisasters] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState({})

  useEffect(() => {
    disasterAPI.list().then(r => setDisasters(r.data || [])).finally(() => setLoading(false))
  }, [])

  const downloadCSV = async (d) => {
    setDownloading(p => ({ ...p, [d.id]: true }))
    try {
      const res = await reportAPI.csv(d.id)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = `report_${d.name.replace(/\s+/g,'_')}.csv`
      a.click(); URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch { toast.error('Export failed') }
    finally { setDownloading(p => ({ ...p, [d.id]: false })) }
  }

  if (loading) return <div className="text-center py-16 text-slate-500">Loading…</div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-sub">Export disaster allocation reports as CSV</p>
      </div>

      <div className="card bg-blue-900/10 border-blue-800">
        <p className="text-sm text-blue-300">
          📋 Each report includes: disaster info, affected areas, severity scores, resource requirements,
          allocation plan, shortage analysis, and AI recommendations.
        </p>
      </div>

      <div className="space-y-3">
        {disasters.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No disasters found.</div>
        ) : disasters.map(d => (
          <div key={d.id} className="card flex items-center justify-between gap-4 hover:border-slate-700 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="font-medium text-white">{d.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-500">{d.disaster_type}</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-xs text-slate-500">{d.date?.slice(0,10)}</span>
                  <span className="text-slate-700">·</span>
                  <span className={SEV_BADGE[d.severity]||'badge-slate'}>{d.severity}</span>
                  <span className={ST_BADGE[d.status]||'badge-slate'}>{d.status}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => downloadCSV(d)}
              disabled={downloading[d.id]}
              className="btn-primary flex-shrink-0">
              {downloading[d.id] ? 'Exporting…' : <><Download size={14} /> Export CSV</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
