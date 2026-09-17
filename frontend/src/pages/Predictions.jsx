import React, { useState } from 'react'
import { predAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TYPES = ['Flood','Cyclone','Earthquake','Landslide','Drought','Tsunami','Wildfire','Storm']
const SEV_COLORS = { Critical:'#ef4444', High:'#f97316', Moderate:'#eab308', Low:'#22c55e' }

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
    <p className="text-slate-400 mb-1">{label}</p>
    {payload.map((p,i) => <p key={i} style={{color:p.fill||p.color}}>{p.name}: {Number(p.value).toFixed(1)}</p>)}
  </div>
}

export default function Predictions() {
  const [tab, setTab] = useState('severity')

  // Severity form
  const [sf, setSf] = useState({
    disaster_type:'Flood', affected_population:'50000', rainfall:'280',
    wind_speed:'0', water_level:'5.5', magnitude:'0',
    infrastructure_damage:'65', medical_emergencies:'200', road_accessibility:'35'
  })
  const [sevResult, setSevResult] = useState(null)
  const [sevLoading, setSevLoading] = useState(false)

  // Resource form
  const [rf, setRf] = useState({
    disaster_type:'Flood', affected_population:'50000',
    severity_category:'High', duration_days:'3',
    medical_emergencies:'200', vulnerable_population:'12000'
  })
  const [resResult, setResResult] = useState(null)
  const [resLoading, setResLoading] = useState(false)

  const predictSeverity = async () => {
    setSevLoading(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(sf).map(([k,v]) => [k, k==='disaster_type' ? v : +v||0])
      )
      const { data } = await predAPI.severity(payload)
      setSevResult(data)
      toast.success(`Severity: ${data.severity_category} (${data.severity_score})`)
    } catch(e) { toast.error(e.response?.data?.detail||'Prediction failed') }
    finally { setSevLoading(false) }
  }

  const predictResources = async () => {
    setResLoading(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(rf).map(([k,v]) => [k, k==='disaster_type'||k==='severity_category' ? v : +v||0])
      )
      const { data } = await predAPI.resources(payload)
      setResResult(data)
      toast.success('Resource requirements predicted')
    } catch(e) { toast.error(e.response?.data?.detail||'Prediction failed') }
    finally { setResLoading(false) }
  }

  const RESOURCE_LABELS = {
    food_packets:'🍱 Food Packets', water_liters:'💧 Water (L)',
    medicine_units:'💊 Medicines', medical_kits:'🩺 Medical Kits',
    blankets:'🛏 Blankets', tents:'⛺ Tents', sanitation_kits:'🧴 Sanitation Kits'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">AI Predictions</h1>
        <p className="page-sub">Rule-based prediction engine (no external APIs required)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {[{id:'severity',label:'🧠 Severity Analysis'},{id:'resources',label:'📦 Resource Requirements'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'severity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="card space-y-4">
            <h3 className="section-title">Disaster Parameters</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Disaster Type</label>
                <select className="select" value={sf.disaster_type} onChange={e=>setSf(p=>({...p,disaster_type:e.target.value}))}>
                  {TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              {[
                {key:'affected_population',label:'Affected Population'},
                {key:'infrastructure_damage',label:'Infrastructure Damage (%)'},
                {key:'medical_emergencies',label:'Medical Emergencies'},
                {key:'rainfall',label:'Rainfall (mm)'},
                {key:'wind_speed',label:'Wind Speed (km/h)'},
                {key:'water_level',label:'Water Level (m)'},
                {key:'magnitude',label:'Magnitude'},
                {key:'road_accessibility',label:'Road Accessibility (%)'},
              ].map(({key,label}) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" step="0.1" className="input"
                    data-testid={key==='affected_population'?'affected-population-pred':key}
                    value={sf[key]} onChange={e=>setSf(p=>({...p,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
            <button className="btn-primary w-full justify-center py-2.5"
              data-testid="predict-severity"
              onClick={predictSeverity} disabled={sevLoading}>
              {sevLoading ? 'Analyzing…' : '🧠 Analyze Disaster Severity'}
            </button>
          </div>

          {/* Result */}
          <div className="space-y-4">
            {sevResult ? (
              <>
                {/* Score card */}
                <div className={`card border-2 ${
                  sevResult.severity_category==='Critical' ? 'border-red-700 bg-red-900/10' :
                  sevResult.severity_category==='High' ? 'border-orange-700 bg-orange-900/10' :
                  sevResult.severity_category==='Moderate' ? 'border-yellow-700 bg-yellow-900/10' :
                  'border-green-700 bg-green-900/10'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Severity</p>
                      <p className="text-4xl font-black mt-1" style={{color:SEV_COLORS[sevResult.severity_category]}}>
                        {sevResult.severity_category}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Score</p>
                      <p className="text-4xl font-bold text-white">{sevResult.severity_score}</p>
                      <p className="text-xs text-slate-500">/ 100</p>
                    </div>
                  </div>
                  <div className="h-3 bg-black/30 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{width:`${sevResult.severity_score}%`,background:SEV_COLORS[sevResult.severity_category]}} />
                  </div>
                  <p className="text-xs text-slate-400">Model: {sevResult.model_used}</p>
                </div>

                {/* Why this prediction */}
                <div className="card">
                  <h3 className="section-title text-sm mb-3">Why this prediction?</h3>
                  <p className="text-xs text-slate-400 mb-4">{sevResult.explanation}</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sevResult.factors||[]} layout="vertical" margin={{left:60,right:20}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10,fill:'#94a3b8'}}/>
                      <YAxis dataKey="feature" type="category" tick={{fontSize:10,fill:'#94a3b8'}} width={120}/>
                      <Tooltip content={<TT/>}/>
                      <Bar dataKey="contribution" name="Contribution" radius={[0,4,4,0]}>
                        {(sevResult.factors||[]).map((_,i)=>(
                          <Cell key={i} fill={SEV_COLORS[sevResult.severity_category]||'#3b82f6'} fillOpacity={0.9-i*0.07}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="card border-dashed border-2 border-slate-700 flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-4xl mb-3">🧠</p>
                  <p className="text-slate-400">Enter parameters and click<br/><strong className="text-white">Analyze Disaster Severity</strong></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-4">
            <h3 className="section-title">Prediction Parameters</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Disaster Type</label>
                <select className="select" value={rf.disaster_type} onChange={e=>setRf(p=>({...p,disaster_type:e.target.value}))}>
                  {TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Severity Category</label>
                <select className="select" value={rf.severity_category} onChange={e=>setRf(p=>({...p,severity_category:e.target.value}))}>
                  {['Low','Moderate','High','Critical'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              {[
                {key:'affected_population',label:'Affected Population'},
                {key:'vulnerable_population',label:'Vulnerable Population'},
                {key:'medical_emergencies',label:'Medical Emergencies'},
                {key:'duration_days',label:'Duration (days)'},
              ].map(({key,label}) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input type="number" className="input" value={rf[key]} onChange={e=>setRf(p=>({...p,[key]:e.target.value}))} />
                </div>
              ))}
            </div>
            <button className="btn-yellow w-full justify-center py-2.5"
              data-testid="predict-resources"
              onClick={predictResources} disabled={resLoading}>
              {resLoading ? 'Predicting…' : '📦 Predict Resource Requirements'}
            </button>
          </div>

          <div>
            {resResult ? (
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="section-title text-sm">Required Resources</h3>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">{resResult.model_used}</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(resResult.predictions||{}).map(([key,val]) => {
                    const maxVal = Math.max(...Object.values(resResult.predictions||{}))
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm w-40 text-slate-300 truncate">{RESOURCE_LABELS[key]||key}</span>
                        <div className="flex-1">
                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min((val/maxVal)*100,100)}%`}}/>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-blue-400 w-20 text-right">{Number(val).toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
                {resResult.note && <p className="text-xs text-slate-500 bg-slate-800 p-2 rounded-lg">{resResult.note}</p>}
              </div>
            ) : (
              <div className="card border-dashed border-2 border-slate-700 flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-slate-400">Enter parameters and click<br/><strong className="text-white">Predict Resource Requirements</strong></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
