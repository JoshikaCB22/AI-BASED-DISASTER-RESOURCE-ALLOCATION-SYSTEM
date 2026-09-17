import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import {
  LayoutDashboard, AlertTriangle, MapPin, Package, Zap,
  Brain, FlaskConical, FileText, ScrollText, Users,
  Map, LogOut, Menu, X, Bell, Shield, ChevronRight
} from 'lucide-react'

// ── Auth Context ──────────────────────────────────────────────────────────────
const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })
  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }
  const logout = () => {
    localStorage.clear()
    setUser(null)
  }
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>
}

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Dashboard     = lazy(() => import('./pages/Dashboard.jsx'))
const Disasters     = lazy(() => import('./pages/Disasters.jsx'))
const Areas         = lazy(() => import('./pages/Areas.jsx'))
const Resources     = lazy(() => import('./pages/Resources.jsx'))
const Allocation    = lazy(() => import('./pages/Allocation.jsx'))
const Predictions   = lazy(() => import('./pages/Predictions.jsx'))
const Simulation    = lazy(() => import('./pages/Simulation.jsx'))
const MapView       = lazy(() => import('./pages/MapView.jsx'))
const Reports       = lazy(() => import('./pages/Reports.jsx'))
const AuditLogs     = lazy(() => import('./pages/AuditLogs.jsx'))
const UserMgmt      = lazy(() => import('./pages/UserMgmt.jsx'))
const Login         = lazy(() => import('./pages/Login.jsx'))

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/disasters',  icon: AlertTriangle,   label: 'Disasters' },
  { to: '/areas',      icon: MapPin,          label: 'Affected Areas' },
  { to: '/map',        icon: Map,             label: 'Map View' },
  { to: '/resources',  icon: Package,         label: 'Resources' },
  { to: '/predictions',icon: Brain,           label: 'AI Predictions' },
  { to: '/allocation', icon: Zap,             label: 'Allocation' },
  { to: '/simulation', icon: FlaskConical,    label: 'What-If Sim' },
  { to: '/reports',    icon: FileText,        label: 'Reports' },
  { to: '/audit',      icon: ScrollText,      label: 'Audit Logs',  roles: ['admin'] },
  { to: '/users',      icon: Users,           label: 'Users',       roles: ['admin'] },
]

// ── Layout ────────────────────────────────────────────────────────────────────
function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!user) return <Navigate to="/login" replace />

  const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user.role))

  const ROLE_BADGE = {
    admin: 'bg-red-900/40 text-red-300',
    disaster_manager: 'bg-orange-900/40 text-orange-300',
    relief_coordinator: 'bg-blue-900/40 text-blue-300',
    analyst: 'bg-green-900/40 text-green-300',
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 flex-shrink-0 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 h-14 px-4 border-b border-slate-800">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={15} className="text-white" />
          </div>
          {sidebarOpen && <span className="text-xs font-bold text-white truncate">DISASTER RELIEF AI</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              title={!sidebarOpen ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                 ${isActive ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`
              }>
              <item.icon size={16} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(v => !v)}
          className="flex items-center justify-center h-10 border-t border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
          {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-500">System Online</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user.role] || 'bg-slate-700 text-slate-300'}`}>
              {user.role.replace('_', ' ')}
            </span>
            <span className="text-sm text-slate-300 font-medium">{user.full_name}</span>
            <button onClick={() => { logout(); navigate('/login') }}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/"            element={<Dashboard />} />
              <Route path="/disasters"   element={<Disasters />} />
              <Route path="/areas"       element={<Areas />} />
              <Route path="/map"         element={<MapView />} />
              <Route path="/resources"   element={<Resources />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/allocation"  element={<Allocation />} />
              <Route path="/simulation"  element={<Simulation />} />
              <Route path="/reports"     element={<Reports />} />
              <Route path="/audit"       element={<AuditLogs />} />
              <Route path="/users"       element={<UserMgmt />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right"
          toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' } }} />
        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-950"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
              <Login />
            </Suspense>
          } />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
