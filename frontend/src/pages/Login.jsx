import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { authAPI } from '../services/api.js'
import { Shield, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const DEMOS = [
  { label: 'Admin',       email: 'admin@disaster.ai',       pass: 'Admin@123',       color: 'bg-red-700' },
  { label: 'Manager',     email: 'manager@disaster.ai',      pass: 'Manager@123',     color: 'bg-orange-700' },
  { label: 'Coordinator', email: 'coordinator@disaster.ai',  pass: 'Coordinator@123', color: 'bg-blue-700' },
  { label: 'Analyst',     email: 'analyst@disaster.ai',      pass: 'Analyst@123',     color: 'bg-green-700' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setErr('Enter email and password'); return }
    setLoading(true); setErr('')
    try {
      const { data } = await authAPI.login(email, pass)
      login(data.user, data.access_token)
      toast.success(`Welcome, ${data.user.full_name}!`)
      navigate('/')
    } catch (e) {
      setErr(e.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold">DISASTER RELIEF AI</p>
            <p className="text-xs text-slate-500">Resource Allocation System</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-white mb-1">Sign In</h2>
          <p className="text-xs text-slate-500 mb-5">Access the disaster management platform</p>

          {err && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-300">{err}</div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input id="login-email" data-testid="login-email" type="email" className="input"
                placeholder="user@disaster.ai" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input id="login-password" data-testid="login-password"
                  type={show ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} />
                <button type="button" onClick={() => setShow(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button id="login-button" data-testid="login-button" type="submit"
              className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-xs text-slate-600 text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMOS.map(d => (
                <button key={d.label} onClick={() => { setEmail(d.email); setPass(d.pass); setErr('') }}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-left transition-all">
                  <div className={`w-5 h-5 ${d.color} rounded flex items-center justify-center text-[10px] text-white font-bold`}>{d.label[0]}</div>
                  <div>
                    <p className="text-xs text-slate-300 font-medium">{d.label}</p>
                    <p className="text-[10px] text-slate-600 truncate">{d.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
