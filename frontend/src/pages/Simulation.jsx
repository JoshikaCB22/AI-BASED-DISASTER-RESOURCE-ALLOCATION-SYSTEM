import React, { useEffect, useState } from 'react'
import { allocAPI, disasterAPI, resourceAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { FlaskConical, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'

const PRI_BADGE = { Critical:'badge-red', High:'badge-orange', Medium:'badge-yellow', Low:'badge-green' }

export default function Simulation() {
  const [disasters, setDisasters] = useState([])
  const [resources, setResources] = useState([])
  const [did, setDid] = useState('')
  const [severityOverride, setSeverityOverride] = useState('')
  const [overrides, setOverrides] = useState({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    Promise.all([disasterAPI.list(), resourceAPI.list()])
      .then(([d, r]) => { setDisasters(d.data || []); setResources(r.data || []) })
  }, [])

  const run = async () => {
    if (!did) { toast.error('Select a disaster'); return }
    setRunning(true)
    try {
      const resource_overrides = {}
      Object.entries(overrides).forEach(([id, val]) => {
        if (val !== '' && !isNaN(+val)) resource_overrides[+id] = +val
      })
      const payload = {
        disaster_id: +did,
        resource_overrides: Object.keys(resource_overrides).length ? resource_overrides : null,
        severity_override: severityOverride || null,
      }
      const { data } = await allocAPI.simulate(payload)
      setResult(data)
      toast.success('Simulation complete')
    } catch (e) { toast.error(e.response?.data?.detail || 'Simulation failed — run allocation first') }
    finally { setRunning(false) }
  }

  const origShort = result?.original?.total_shortage ?? 0
  const simShort = result?.simulated?.total_shortage ?? 0
  const diff = simShort - origShort

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2"><FlaskConical size={22} className="text-purple-400" /> What-If Simulation</h1>
        <p className="page-sub">Change resource quantities or severity and instantly see the impact on allocation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="section-title text-sm mb-4">Simulation Parameters</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Disaster *</label>
                <select className="select" value={did} onChange={e => { setDid(e.target.value); setResult(null) }}>
                  <option value="">Select…</option>
                  {disasters.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Override Severity</label>
                <select className="select" value={severityOverride} onChange={e => setSeverityOverride(e.target.value)}>
                  <option value="">Keep current</option>
                  {['Low','Moderate','High','Critical'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">Override Resource Quantities</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {resources.map(r => (
                    <div key={r.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 truncate">{r.name}</p>
                        <p className="text-xs text-slate-600">Current: {r.quantity_available?.toLocaleString()}</p>
                      </div>
                      <input type="number" className="input w-24 text-xs py-1.5"
                        placeholder={String(r.quantity_available)}
                        value={overrides[r.id] ?? ''}
                        onChange={e => setOverrides(p => ({ ...p, [r.id]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn-primary flex-1 justify-center" onClick={run} disabled={running || !did}>
                  {running ? 'Running…' : <><Zap size={14} /> Simulate</>}
                </button>
                <button className="btn-ghost px-3" onClick={() => { setOverrides({}); setSeverityOverride(''); setResult(null) }} title="Reset">↺</button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {running ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Comparison summary */}
              <div className="card border-purple-800 bg-purple-900/10">
                <h3 className="text-sm font-semibold text-purple-300 mb-4">Simulation Result</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Original Shortage</p>
                    <p className="text-2xl font-bold text-red-400">{origShort.toLocaleString()}</p>
                  </div>
                  <div className="text-center border-x border-purple-800">
                    <p className="text-xs text-slate-500 mb-1">Change</p>
                    <div className="flex items-center justify-center gap-1">
                      {diff > 0 ? <TrendingUp size={18} className="text-red-400" /> :
                       diff < 0 ? <TrendingDown size={18} className="text-green-400" /> :
                       <Minus size={18} className="text-slate-400" />}
                      <p className={`text-2xl font-bold ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Simulated Shortage</p>
                    <p className="text-2xl font-bold text-red-400">{simShort.toLocaleString()}</p>
                  </div>
                </div>
                {diff < 0 && <p className="text-center text-green-400 text-xs mt-3">✓ Shortage reduced by {Math.abs(diff).toLocaleString()} units</p>}
                {diff > 0 && <p className="text-center text-red-400 text-xs mt-3">⚠ Shortage increased by {diff.toLocaleString()} units</p>}
                {diff === 0 && <p className="text-center text-slate-400 text-xs mt-3">No change in shortage</p>}
              </div>

              {/* Side-by-side tables */}
              <div className="grid grid-cols-1 gap-4">
                <div className="card">
                  <p className="text-sm font-medium text-slate-300 mb-3">📊 Simulated Allocation Plan</p>
                  <div className="overflow-x-auto">
                    <table className="tbl text-xs">
                      <thead><tr><th>Area</th><th>Resource</th><th>Required</th><th>Allocated</th><th>Shortage</th><th>Priority</th></tr></thead>
                      <tbody>
                        {(result.simulated?.allocations || []).slice(0, 20).map((a, i) => (
                          <tr key={i}>
                            <td className="text-slate-200">{a.area_name}</td>
                            <td className="text-slate-400">{a.resource_name}</td>
                            <td>{a.required_qty?.toLocaleString()}</td>
                            <td className="text-green-400">{a.allocated_qty?.toLocaleString()}</td>
                            <td className={a.shortage > 0 ? 'text-red-400' : 'text-green-400'}>{a.shortage?.toLocaleString()}</td>
                            <td><span className={PRI_BADGE[a.priority_level]||'badge-slate'}>{a.priority_level}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(result.simulated?.allocations || []).length > 20 &&
                      <p className="text-xs text-slate-600 mt-2 text-center">…and {result.simulated.allocations.length - 20} more</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card border-dashed border-2 border-slate-700 flex items-center justify-center h-80">
              <div className="text-center">
                <p className="text-5xl mb-4">🧪</p>
                <p className="text-slate-300 font-medium text-lg">What-If Simulation</p>
                <p className="text-slate-500 text-sm mt-2 max-w-xs">
                  Change resource quantities or severity level,<br />then click <strong className="text-white">Simulate</strong> to see the impact
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
