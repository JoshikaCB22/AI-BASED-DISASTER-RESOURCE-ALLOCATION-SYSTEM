import React, { useEffect, useState, useCallback } from 'react'
import { allocAPI, disasterAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { Zap, CheckCircle, XCircle, Truck, Eye, RefreshCw } from 'lucide-react'

const PRI_BADGE = { Critical:'badge-red', High:'badge-orange', Medium:'badge-yellow', Low:'badge-green' }
const ST_BADGE  = { Pending:'badge-blue', Approved:'badge-green', Dispatched:'badge-blue', Delivered:'badge-green', Rejected:'badge-red' }

function ExplainModal({ alloc, onClose }) {
  if (!alloc) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Allocation Explanation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl">
            <div className="flex-1">
              <p className="font-semibold text-white">{alloc.area_name}</p>
              <p className="text-xs text-slate-400">{alloc.resource_name} · {alloc.allocated_qty?.toLocaleString()} {alloc.unit}</p>
            </div>
            <span className={PRI_BADGE[alloc.priority_level]||'badge-slate'}>{alloc.priority_level}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              {l:'Required',   v:`${alloc.required_qty?.toLocaleString()} ${alloc.unit}`},
              {l:'Allocated',  v:`${alloc.allocated_qty?.toLocaleString()} ${alloc.unit}`, accent:true},
              {l:'Shortage',   v:`${alloc.shortage?.toLocaleString()} ${alloc.unit}`, danger:alloc.shortage>0},
              {l:'Priority Score', v:`${alloc.priority_score?.toFixed(1)}/100`},
            ].map(({l,v,accent,danger})=>(
              <div key={l} className="p-3 bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">{l}</p>
                <p className={`font-medium ${accent?'text-green-400':danger?'text-red-400':'text-white'}`}>{v}</p>
              </div>
            ))}
          </div>
          {alloc.reason && (
            <div className="bg-slate-800 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-400 mb-2">Reason:</p>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{alloc.reason}</pre>
            </div>
          )}
        </div>
        <div className="flex justify-end p-5 border-t border-slate-800">
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Allocation() {
  const [disasters, setDisasters] = useState([])
  const [did, setDid] = useState('')
  const [allocs, setAllocs] = useState([])
  const [shortages, setShortages] = useState([])
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [explain, setExplain] = useState(null)
  const [approveId, setApproveId] = useState(null)
  const [rejectId, setRejectId] = useState(null)
  const [comment, setComment] = useState('')

  useEffect(() => {
    disasterAPI.list().then(r => setDisasters(r.data || []))
  }, [])

  const load = useCallback(async () => {
    if (!did) return
    setLoading(true)
    try {
      const [a, s] = await Promise.all([
        allocAPI.list({ disaster_id: did }),
        allocAPI.shortages(did)
      ])
      setAllocs(a.data || [])
      setShortages(s.data || [])
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [did])

  useEffect(() => { load() }, [load])

  const handlePredict = async () => {
    if (!did) { toast.error('Select a disaster first'); return }
    setPredicting(true)
    try {
      const r = await allocAPI.predictReqs(did)
      toast.success(`Requirements predicted for ${r.data.areas} area(s)`)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') } finally { setPredicting(false) }
  }

  const handleOptimize = async () => {
    if (!did) { toast.error('Select a disaster first'); return }
    setOptimizing(true)
    try {
      const r = await allocAPI.optimize(did)
      toast.success(`Optimization done: ${r.data.total_allocations} allocations, shortage: ${r.data.total_shortage?.toLocaleString()}`)
      load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Optimization failed — add affected areas first') } finally { setOptimizing(false) }
  }

  const handleApprove = async () => {
    try {
      await allocAPI.approve(approveId, comment)
      toast.success('Approved — inventory deducted')
      setApproveId(null); setComment(''); load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
  }

  const handleReject = async () => {
    try {
      await allocAPI.reject(rejectId, comment)
      toast.success('Rejected')
      setRejectId(null); setComment(''); load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
  }

  const totalShortage = allocs.reduce((s, a) => s + (a.shortage || 0), 0)
  const totalAllocated = allocs.reduce((s, a) => s + (a.allocated_qty || 0), 0)
  const pending = allocs.filter(a => a.status === 'Pending').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Resource Allocation</h1>
        <p className="page-sub">AI-optimized priority-aware allocation engine</p>
      </div>

      {/* Controls */}
      <div className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="label">Select Disaster</label>
          <select className="select" value={did} onChange={e => { setDid(e.target.value); setAllocs([]) }}>
            <option value="">Choose disaster…</option>
            {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button className="btn-ghost" onClick={handlePredict} disabled={predicting || !did}>
          {predicting ? 'Predicting…' : '📊 Predict Requirements'}
        </button>
        <button className="btn-primary" data-testid="optimize-allocation" onClick={handleOptimize} disabled={optimizing || !did}>
          {optimizing ? 'Optimizing…' : <><Zap size={14} /> Optimize Allocation</>}
        </button>
        <button className="btn-ghost" onClick={load} disabled={!did}><RefreshCw size={14} /></button>
      </div>

      {did && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l:'Total Allocations', v:allocs.length,                            c:'text-white' },
              { l:'Total Allocated',   v:totalAllocated.toLocaleString(),           c:'text-green-400' },
              { l:'Total Shortage',    v:totalShortage.toLocaleString(),            c:totalShortage>0?'text-red-400':'text-green-400' },
              { l:'Pending Approval',  v:pending,                                   c:pending>0?'text-yellow-400':'text-white' },
            ].map(s => (
              <div key={s.l} className="card text-center">
                <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Shortage alert */}
          {shortages.some(s => s.shortage > 0) && (
            <div className="card border-red-800 bg-red-900/10">
              <p className="text-sm font-medium text-red-300 mb-3">⚠ Resource Shortages Detected</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {shortages.filter(s => s.shortage > 0).map(s => (
                  <div key={s.resource_id} className="bg-slate-900 rounded-lg p-3 text-xs">
                    <p className="text-slate-200 font-medium truncate">{s.resource_name}</p>
                    <p className="text-red-400 mt-1">Short: {s.shortage.toLocaleString()} {s.unit}</p>
                    <p className="text-slate-500">Need: {s.required.toLocaleString()} · Have: {s.available.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? <div className="text-center py-10 text-slate-500">Loading…</div> :
            allocs.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-4xl mb-3">⚡</p>
                <p className="font-medium text-slate-300">No allocations yet</p>
                <p className="text-sm mt-1">Click "Predict Requirements" then "Optimize Allocation"</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="tbl">
                  <thead><tr><th>Area</th><th>Resource</th><th>Required</th><th>Allocated</th><th>Shortage</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {allocs.map(a => (
                      <tr key={a.id}>
                        <td className="font-medium text-white">{a.area_name}</td>
                        <td>{a.resource_name}</td>
                        <td className="text-slate-400">{a.required_qty?.toLocaleString()} {a.unit}</td>
                        <td className="text-green-400 font-medium">{a.allocated_qty?.toLocaleString()}</td>
                        <td className={a.shortage > 0 ? 'text-red-400 font-medium' : 'text-green-400'}>{a.shortage?.toLocaleString()}</td>
                        <td>
                          <span className={PRI_BADGE[a.priority_level]||'badge-slate'}>{a.priority_level}</span>
                          <span className="text-xs text-slate-600 ml-1">({a.priority_score?.toFixed(0)})</span>
                        </td>
                        <td><span className={ST_BADGE[a.status]||'badge-slate'}>{a.status}</span></td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => setExplain(a)} title="Explain" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-blue-400"><Eye size={13} /></button>
                            {a.status === 'Pending' && <>
                              <button onClick={() => { setApproveId(a.id); setComment('') }} title="Approve" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400" data-testid={`approve-${a.id}`}><CheckCircle size={13} /></button>
                              <button onClick={() => { setRejectId(a.id); setComment('') }} title="Reject" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><XCircle size={13} /></button>
                            </>}
                            {a.status === 'Approved' &&
                              <button onClick={async () => { await allocAPI.dispatch(a.id); toast.success('Dispatched'); load() }} title="Dispatch" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-purple-400"><Truck size={13} /></button>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}

      <ExplainModal alloc={explain} onClose={() => setExplain(null)} />

      {/* Approve modal */}
      {approveId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full">
            <p className="font-medium text-white mb-1">Approve Allocation?</p>
            <p className="text-xs text-slate-400 mb-4">Inventory will be deducted when approved.</p>
            <label className="label">Comments (optional)</label>
            <textarea className="input mb-4" rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Approval notes…" />
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setApproveId(null)}>Cancel</button>
              <button className="btn-green" onClick={handleApprove}><CheckCircle size={14} /> Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-sm w-full">
            <p className="font-medium text-white mb-1">Reject Allocation?</p>
            <label className="label">Reason</label>
            <textarea className="input mb-4" rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Reason for rejection…" />
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setRejectId(null)}>Cancel</button>
              <button className="btn-red" onClick={handleReject}><XCircle size={14} /> Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
