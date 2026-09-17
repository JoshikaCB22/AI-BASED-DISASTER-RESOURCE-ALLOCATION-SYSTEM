import React, { useEffect, useState, useCallback } from 'react'
import { userAPI } from '../services/api.js'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Users, RefreshCw } from 'lucide-react'

const ROLES = ['admin','disaster_manager','relief_coordinator','analyst']
const ROLE_BADGE = {
  admin:'badge-red', disaster_manager:'badge-orange',
  relief_coordinator:'badge-blue', analyst:'badge-green'
}
const EMPTY = { email:'', full_name:'', password:'', role:'analyst' }

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md">
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

export default function UserMgmt() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [delId, setDelId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await userAPI.list(); setUsers(data) }
    catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY); setEditId(null); setShowForm(true) }
  const openEdit   = u => { setForm({ ...u, password:'' }); setEditId(u.id); setShowForm(true) }
  const f = v => setForm(p => ({ ...p, ...v }))

  const save = async () => {
    if (!form.email || !form.full_name || (!editId && !form.password)) {
      toast.error('Email, name and password required'); return
    }
    setSaving(true)
    try {
      if (editId) {
        await userAPI.update(editId, { full_name: form.full_name, role: form.role, is_active: true })
        toast.success('User updated')
      } else {
        await userAPI.create({ email: form.email, full_name: form.full_name, password: form.password, role: form.role })
        toast.success('User created')
      }
      setShowForm(false); load()
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users size={22} /> User Management</h1>
          <p className="page-sub">{users.length} users · Admin only</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={load}><RefreshCw size={14} /></button>
          <button className="btn-primary" onClick={openCreate}><Plus size={15} /> Add User</button>
        </div>
      </div>

      {loading ? <div className="text-center py-16 text-slate-500">Loading…</div> :
        users.length === 0 ? <div className="text-center py-16 text-slate-500">No users found.</div> : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="tbl">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-400">{u.full_name?.[0]}</span>
                        </div>
                        <span className="font-medium text-white">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-400 text-xs">{u.email}</td>
                    <td><span className={ROLE_BADGE[u.role]||'badge-slate'}>{u.role?.replace('_',' ')}</span></td>
                    <td><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400"><Edit2 size={13} /></button>
                        <button onClick={() => setDelId(u.id)} className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit User' : 'Add User'}
        footer={<><button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
        <div className="space-y-4">
          <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={e => f({ full_name: e.target.value })} /></div>
          {!editId && <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={e => f({ email: e.target.value })} /></div>}
          {!editId && <div><label className="label">Password *</label><input type="password" className="input" value={form.password} onChange={e => f({ password: e.target.value })} /></div>}
          <div><label className="label">Role</label>
            <select className="select" value={form.role} onChange={e => f({ role: e.target.value })}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {delId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card max-w-sm w-full mx-4">
            <p className="font-medium text-white mb-2">Delete User?</p>
            <p className="text-sm text-slate-400 mb-5">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn-red" onClick={async () => { await userAPI.delete(delId); toast.success('Deleted'); setDelId(null); load() }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
