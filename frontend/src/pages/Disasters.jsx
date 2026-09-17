import React, { useEffect, useState, useCallback } from 'react'
import { disasterAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react'

const TYPES    = ['Flood','Cyclone','Earthquake','Landslide','Drought','Tsunami','Wildfire','Storm']
const STATUSES = ['Active','Monitoring','Resolved']
const SEVS     = ['Low','Moderate','High','Critical']

const SEV_BADGE = { Critical:'badge-red', High:'badge-orange', Moderate:'badge-yellow', Low:'badge-green' }
const ST_BADGE  = { Active:'badge-green', Monitoring:'badge-blue', Resolved:'badge-slate' }

const EMPTY = {
  name:'', disaster_type:'Flood', location:'', latitude:'', longitude:'',
  date: new Date().toISOString().slice(0,10), status:'Active', severity:'Moderate',
  affected_population:'0', area_affected:'0', rainfall:'0', wind_speed:'0',
  water_level:'0', magnitude:'0', infrastructure_damage:'0',
  medical_emergencies:'0', road_accessibility:'100', duration_days:'1', description:''
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 p-5 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

export default function Disasters() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]  = useState('')
  const [status, setStatus]  = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [delId, setDelId]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = {}
      if (search) p.search = search
      if (status) p.status = status
      const { data } = await disasterAPI.list(p)
      setList(data)
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [search, status])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit   = d => { setForm({...d, date: d.date?.slice(0,10)||''}); setEditId(d.id); setShowForm(true) }
  const f = v => setForm(p => ({ ...p, ...v }))

  const save = async () => {
    if (!form.name || !form.location) { toast.error('Name and location required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        latitude: +form.latitude||0, longitude: +form.longitude||0,
        affected_population: +form.affected_population||0,
        area_affected:+form.area_affected||0, rainfall:+form.rainfall||0,
        wind_speed:+form.wind_speed||0, water_level:+form.water_level||0,
        magnitude:+form.magnitude||0, infrastructure_damage:+form.infrastructure_damage||0,
        medical_emergencies:+form.medical_emergencies||0,
        road_accessibility:+form.road_accessibility||100,
        duration_days:+form.duration_days||1,
      }
      if (editId) { await disasterAPI.update(editId, payload); toast.success('Updated') }
      else        { await disasterAPI.create(payload);          toast.success('Created') }
      setShowForm(false); load()
    } catch(e) { toast.error(e.response?.data?.detail||'Save failed') } finally { setSaving(false) }
  }

  const del = async () => {
    try { await disasterAPI.delete(delId); toast.success('Deleted'); setDelId(null); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Disasters</h1><p className="page-sub">{list.length} records</p></div>
        <button className="btn-primary" onClick={openCreate} data-testid="create-disaster-btn"><Plus size={15}/> New Disaster</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-9" placeholder="Search by name…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="select w-36" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <button className="btn-ghost" onClick={load}><RefreshCw size={14}/></button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading…</div>
      ) : list.length===0 ? (
        <div className="text-center py-16 text-slate-500">No disasters found. Create one to get started.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Type</th><th>Location</th><th>Date</th><th>Severity</th><th>Affected</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map(d => (
                <tr key={d.id}>
                  <td className="font-medium text-white">{d.name}</td>
                  <td>{d.disaster_type}</td>
                  <td className="text-slate-400 text-xs">{d.location}</td>
                  <td className="text-slate-400 text-xs">{d.date?.slice(0,10)}</td>
                  <td><span className={SEV_BADGE[d.severity]||'badge-slate'}>{d.severity}</span></td>
                  <td>{d.affected_population?.toLocaleString()}</td>
                  <td><span className={ST_BADGE[d.status]||'badge-slate'}>{d.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={()=>openEdit(d)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400"><Edit2 size={13}/></button>
                      <button onClick={()=>setDelId(d.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      <Modal open={showForm} onClose={()=>setShowForm(false)} title={editId?'Edit Disaster':'New Disaster'}
        footer={<><button className="btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e=>f({name:e.target.value})} data-testid="disaster-name"/></div>
          <div><label className="label">Type</label>
            <select className="select" value={form.disaster_type} onChange={e=>f({disaster_type:e.target.value})} data-testid="disaster-type">
              {TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Location *</label><input className="input" value={form.location} onChange={e=>f({location:e.target.value})}/></div>
          <div><label className="label">Latitude</label><input type="number" step="0.0001" className="input" value={form.latitude} onChange={e=>f({latitude:e.target.value})}/></div>
          <div><label className="label">Longitude</label><input type="number" step="0.0001" className="input" value={form.longitude} onChange={e=>f({longitude:e.target.value})}/></div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={e=>f({date:e.target.value})}/></div>
          <div><label className="label">Status</label>
            <select className="select" value={form.status} onChange={e=>f({status:e.target.value})}>
              {STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Severity</label>
            <select className="select" value={form.severity} onChange={e=>f({severity:e.target.value})}>
              {SEVS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="label">Affected Population</label><input type="number" className="input" data-testid="affected-population" value={form.affected_population} onChange={e=>f({affected_population:e.target.value})}/></div>
          <div><label className="label">Rainfall (mm)</label><input type="number" className="input" value={form.rainfall} onChange={e=>f({rainfall:e.target.value})}/></div>
          <div><label className="label">Wind Speed (km/h)</label><input type="number" className="input" value={form.wind_speed} onChange={e=>f({wind_speed:e.target.value})}/></div>
          <div><label className="label">Water Level (m)</label><input type="number" step="0.1" className="input" value={form.water_level} onChange={e=>f({water_level:e.target.value})}/></div>
          <div><label className="label">Magnitude</label><input type="number" step="0.1" className="input" value={form.magnitude} onChange={e=>f({magnitude:e.target.value})}/></div>
          <div><label className="label">Infrastructure Damage (%)</label><input type="number" className="input" value={form.infrastructure_damage} onChange={e=>f({infrastructure_damage:e.target.value})}/></div>
          <div><label className="label">Medical Emergencies</label><input type="number" className="input" value={form.medical_emergencies} onChange={e=>f({medical_emergencies:e.target.value})}/></div>
          <div><label className="label">Road Accessibility (%)</label><input type="number" className="input" value={form.road_accessibility} onChange={e=>f({road_accessibility:e.target.value})}/></div>
          <div><label className="label">Duration (days)</label><input type="number" className="input" value={form.duration_days} onChange={e=>f({duration_days:e.target.value})}/></div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e=>f({description:e.target.value})}/></div>
        </div>
      </Modal>

      {/* Delete confirm */}
      {delId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-sm w-full mx-4">
            <p className="font-medium text-white mb-2">Delete Disaster?</p>
            <p className="text-sm text-slate-400 mb-5">This will permanently remove the disaster and all linked data.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={()=>setDelId(null)}>Cancel</button>
              <button className="btn-red" onClick={del}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
