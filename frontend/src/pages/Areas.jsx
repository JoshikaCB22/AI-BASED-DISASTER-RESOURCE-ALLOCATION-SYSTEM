import React, { useEffect, useState, useCallback } from 'react'
import { areaAPI, disasterAPI } from '../services/api.js'

import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'

const PRI_BADGE = { Critical:'badge-red', High:'badge-orange', Medium:'badge-yellow', Low:'badge-green' }
const EMPTY = {
  disaster_id:'', name:'', district:'', state:'',
  latitude:'', longitude:'',
  affected_population:'0', vulnerable_population:'0',
  infrastructure_damage:'0', medical_emergencies:'0', road_accessibility:'100'
}

function Modal({open,onClose,title,children,footer}){
  if(!open) return null
  return(
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
        {footer&&<div className="flex justify-end gap-3 p-5 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

export default function Areas() {
  const [list,setList]=useState([])
  const [disasters,setDisasters]=useState([])
  const [loading,setLoading]=useState(true)
  const [filterDid,setFilterDid]=useState('')
  const [showForm,setShowForm]=useState(false)
  const [editId,setEditId]=useState(null)
  const [form,setForm]=useState(EMPTY)
  const [saving,setSaving]=useState(false)
  const [delId,setDelId]=useState(null)

  const load=useCallback(async()=>{
    setLoading(true)
    try{
      const p={}; if(filterDid) p.disaster_id=filterDid
      const [a,d]=await Promise.all([areaAPI.list(p),disasterAPI.list()])
      setList(a.data); setDisasters(d.data)
    }catch{toast.error('Failed')}finally{setLoading(false)}
  },[filterDid])

  useEffect(()=>{load()},[load])

  const openCreate=()=>{setForm({...EMPTY,disaster_id:filterDid||''});setEditId(null);setShowForm(true)}
  const openEdit=a=>{setForm({...a});setEditId(a.id);setShowForm(true)}
  const f=v=>setForm(p=>({...p,...v}))

  const save=async()=>{
    if(!form.name||!form.disaster_id){toast.error('Name and disaster required');return}
    setSaving(true)
    try{
      const payload={...form,disaster_id:+form.disaster_id,
        latitude:+form.latitude||0,longitude:+form.longitude||0,
        affected_population:+form.affected_population||0,
        vulnerable_population:+form.vulnerable_population||0,
        infrastructure_damage:+form.infrastructure_damage||0,
        medical_emergencies:+form.medical_emergencies||0,
        road_accessibility:+form.road_accessibility||100}
      if(editId){await areaAPI.update(editId,payload);toast.success('Updated')}
      else{await areaAPI.create(payload);toast.success('Created')}
      setShowForm(false);load()
    }catch(e){toast.error(e.response?.data?.detail||'Failed')}finally{setSaving(false)}
  }

  return(
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Affected Areas</h1><p className="page-sub">{list.length} areas</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15}/> Add Area</button>
      </div>

      <div className="flex gap-3">
        <select className="select w-56" value={filterDid} onChange={e=>setFilterDid(e.target.value)}>
          <option value="">All Disasters</option>
          {disasters.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="btn-ghost" onClick={load}><RefreshCw size={14}/></button>
      </div>

      {loading?<div className="text-center py-16 text-slate-500">Loading…</div>:
       list.length===0?<div className="text-center py-16 text-slate-500">No areas found.</div>:(
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="tbl">
            <thead><tr><th>Area</th><th>Location</th><th>Affected Pop</th><th>Vulnerable</th><th>Infra Damage</th><th>Medical</th><th>Road Access</th><th>Priority</th><th>Actions</th></tr></thead>
            <tbody>
              {list.map(a=>(
                <tr key={a.id}>
                  <td className="font-medium text-white">{a.name}</td>
                  <td className="text-slate-400 text-xs">{a.district}{a.state?`, ${a.state}`:''}</td>
                  <td>{a.affected_population?.toLocaleString()}</td>
                  <td>{a.vulnerable_population?.toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full" style={{width:`${a.infrastructure_damage}%`}}/>
                      </div>
                      <span className="text-xs text-slate-400">{a.infrastructure_damage}%</span>
                    </div>
                  </td>
                  <td>{a.medical_emergencies}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{width:`${a.road_accessibility}%`}}/>
                      </div>
                      <span className="text-xs text-slate-400">{a.road_accessibility}%</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className={PRI_BADGE[a.priority_level]||'badge-slate'}>{a.priority_level}</span>
                      <p className="text-xs text-slate-600 mt-0.5">{a.priority_score?.toFixed(1)}/100</p>
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={()=>openEdit(a)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400"><Edit2 size={13}/></button>
                      <button onClick={()=>setDelId(a.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={()=>setShowForm(false)} title={editId?'Edit Area':'Add Affected Area'}
        footer={<><button className="btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Disaster *</label>
            <select className="select" value={form.disaster_id} onChange={e=>f({disaster_id:e.target.value})}>
              <option value="">Select…</option>
              {disasters.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Area Name *</label><input className="input" value={form.name} onChange={e=>f({name:e.target.value})}/></div>
          <div><label className="label">District</label><input className="input" value={form.district} onChange={e=>f({district:e.target.value})}/></div>
          <div><label className="label">State</label><input className="input" value={form.state} onChange={e=>f({state:e.target.value})}/></div>
          <div><label className="label">Latitude</label><input type="number" step="0.0001" className="input" value={form.latitude} onChange={e=>f({latitude:e.target.value})}/></div>
          <div><label className="label">Longitude</label><input type="number" step="0.0001" className="input" value={form.longitude} onChange={e=>f({longitude:e.target.value})}/></div>
          <div><label className="label">Affected Population</label><input type="number" className="input" value={form.affected_population} onChange={e=>f({affected_population:e.target.value})}/></div>
          <div><label className="label">Vulnerable Population</label><input type="number" className="input" value={form.vulnerable_population} onChange={e=>f({vulnerable_population:e.target.value})}/></div>
          <div><label className="label">Infrastructure Damage (%)</label><input type="number" className="input" value={form.infrastructure_damage} onChange={e=>f({infrastructure_damage:e.target.value})}/></div>
          <div><label className="label">Medical Emergencies</label><input type="number" className="input" value={form.medical_emergencies} onChange={e=>f({medical_emergencies:e.target.value})}/></div>
          <div><label className="label">Road Accessibility (%)</label><input type="number" className="input" value={form.road_accessibility} onChange={e=>f({road_accessibility:e.target.value})}/></div>
        </div>
      </Modal>

      {delId&&(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-sm w-full mx-4">
            <p className="font-medium text-white mb-2">Delete Area?</p>
            <p className="text-sm text-slate-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={()=>setDelId(null)}>Cancel</button>
              <button className="btn-red" onClick={async()=>{await areaAPI.delete(delId);toast.success('Deleted');setDelId(null);load()}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
