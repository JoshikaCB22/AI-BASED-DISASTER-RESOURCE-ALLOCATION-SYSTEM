import React, { useEffect, useState, useCallback } from 'react'
import { resourceAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

const CATS = ['Food','Water','Medical','Shelter','Sanitation','Rescue Equip','Vehicles','Fuel']
const EMPTY = { name:'', category:'Food', unit:'units', quantity_available:'0', min_stock_level:'0', supplier:'', warehouse:'' }

const ST_BADGE = { Available:'badge-green', 'Low Stock':'badge-yellow', 'Out of Stock':'badge-red' }

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 p-5 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  )
}

export default function Resources() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('')
  const [filterSt, setFilterSt] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [stockModal, setStockModal] = useState(null)
  const [stockAction, setStockAction] = useState('increase')
  const [stockQty, setStockQty] = useState('')
  const [stockReason, setStockReason] = useState('')
  const [delId, setDelId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = {}
      if (filterCat) p.category = filterCat
      if (filterSt) p.status = filterSt
      const { data } = await resourceAPI.list(p)
      setList(data)
    } catch { toast.error('Failed') } finally { setLoading(false) }
  }, [filterCat, filterSt])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit = r => { setForm({ ...r }); setEditId(r.id); setShowForm(true) }
  const f = v => setForm(p => ({ ...p, ...v }))

  const save = async () => {
    if (!form.name) { toast.error('Name required'); return }
    setSaving(true)
    try {
      const payload = { ...form, quantity_available: +form.quantity_available || 0, min_stock_level: +form.min_stock_level || 0 }
      if (editId) { await resourceAPI.update(editId, payload); toast.success('Updated') }
      else { await resourceAPI.create(payload); toast.success('Created') }
      setShowForm(false); load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const updateStock = async () => {
    if (!stockQty || +stockQty <= 0) { toast.error('Enter valid quantity'); return }
    try {
      const r = await resourceAPI.stock(stockModal.id, { action: stockAction, quantity: +stockQty, reason: stockReason })
      toast.success(`Stock updated. New qty: ${r.data.quantity_available}`)
      setStockModal(null); setStockQty(''); setStockReason(''); load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
  }

  const summary = {
    available: list.filter(r => r.status === 'Available').length,
    low: list.filter(r => r.status === 'Low Stock').length,
    out: list.filter(r => r.status === 'Out of Stock').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Resource Inventory</h1><p className="page-sub">{list.length} items</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add Resource</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Available',    count: summary.available, cls: 'border-green-800 bg-green-900/20',  tcls: 'text-green-400' },
          { label: 'Low Stock',    count: summary.low,       cls: 'border-yellow-800 bg-yellow-900/20',tcls: 'text-yellow-400' },
          { label: 'Out of Stock', count: summary.out,       cls: 'border-red-800 bg-red-900/20',      tcls: 'text-red-400' },
        ].map(s => (
          <button key={s.label} onClick={() => setFilterSt(filterSt === s.label ? '' : s.label)}
            className={`border rounded-xl p-4 text-center transition-all ${s.cls} ${filterSt === s.label ? 'ring-2 ring-white/20' : ''}`}>
            <p className={`text-2xl font-bold ${s.tcls}`}>{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="select w-40" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-ghost" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {loading ? <div className="text-center py-16 text-slate-500">Loading…</div> :
        list.length === 0 ? <div className="text-center py-16 text-slate-500">No resources found.</div> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="tbl">
              <thead><tr><th>Name</th><th>Category</th><th>Stock</th><th>Min Level</th><th>Status</th><th>Warehouse</th><th>Supplier</th><th>Actions</th></tr></thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-white">{r.name}</td>
                    <td>{r.category}</td>
                    <td>
                      <span className={r.status === 'Available' ? 'text-green-400 font-medium' : r.status === 'Low Stock' ? 'text-yellow-400 font-medium' : 'text-red-400 font-medium'}>
                        {r.quantity_available?.toLocaleString()} {r.unit}
                      </span>
                    </td>
                    <td className="text-slate-400 text-xs">{r.min_stock_level?.toLocaleString()}</td>
                    <td><span className={ST_BADGE[r.status] || 'badge-slate'}>{r.status}</span></td>
                    <td className="text-slate-400 text-xs">{r.warehouse || '—'}</td>
                    <td className="text-slate-400 text-xs">{r.supplier || '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setStockModal(r); setStockAction('increase'); setStockQty('') }} title="Add stock" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-green-400"><TrendingUp size={13} /></button>
                        <button onClick={() => { setStockModal(r); setStockAction('decrease'); setStockQty('') }} title="Remove stock" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-orange-400"><TrendingDown size={13} /></button>
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400"><Edit2 size={13} /></button>
                        <button onClick={() => setDelId(r.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Resource' : 'Add Resource'}
        footer={<><button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => f({ name: e.target.value })} /></div>
          <div><label className="label">Category</label>
            <select className="select" value={form.category} onChange={e => f({ category: e.target.value })}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Unit</label><input className="input" value={form.unit} onChange={e => f({ unit: e.target.value })} placeholder="packets, liters…" /></div>
          <div><label className="label">Quantity Available</label><input type="number" className="input" value={form.quantity_available} onChange={e => f({ quantity_available: e.target.value })} /></div>
          <div><label className="label">Min Stock Level</label><input type="number" className="input" value={form.min_stock_level} onChange={e => f({ min_stock_level: e.target.value })} /></div>
          <div><label className="label">Supplier</label><input className="input" value={form.supplier} onChange={e => f({ supplier: e.target.value })} /></div>
          <div className="col-span-2"><label className="label">Warehouse</label><input className="input" value={form.warehouse} onChange={e => f({ warehouse: e.target.value })} /></div>
        </div>
      </Modal>

      {/* Stock update modal */}
      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={`${stockAction === 'increase' ? 'Add' : 'Remove'} Stock: ${stockModal?.name}`}
        footer={<><button className="btn-ghost" onClick={() => setStockModal(null)}>Cancel</button>
          <button className={stockAction === 'increase' ? 'btn-green' : 'btn-yellow'} onClick={updateStock}>
            {stockAction === 'increase' ? <TrendingUp size={14} /> : <TrendingDown size={14} />} Update Stock
          </button></>}>
        <div className="space-y-4">
          <div className="flex gap-2">
            {['increase', 'decrease'].map(a => (
              <button key={a} onClick={() => setStockAction(a)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${stockAction === a ? (a === 'increase' ? 'bg-green-600 text-white' : 'bg-orange-600 text-white') : 'bg-slate-800 text-slate-400'}`}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
          <div><label className="label">Current Stock: <span className="text-blue-400">{stockModal?.quantity_available?.toLocaleString()} {stockModal?.unit}</span></label></div>
          <div><label className="label">Quantity *</label>
            <input type="number" className="input" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="Enter quantity" />
          </div>
          <div><label className="label">Reason</label>
            <input className="input" value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="Optional reason" />
          </div>
        </div>
      </Modal>

      {delId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-sm w-full mx-4">
            <p className="font-medium text-white mb-2">Delete Resource?</p>
            <p className="text-sm text-slate-400 mb-5">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn-red" onClick={async () => { await resourceAPI.delete(delId); toast.success('Deleted'); setDelId(null); load() }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
