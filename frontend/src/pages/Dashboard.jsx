import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashAPI } from '../services/api.js'
import { AlertTriangle, Users, Package, Zap, TrendingDown, Clock, CheckCircle, Truck } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SEVERITY_COLORS = { Critical: '#ef4444', High: '#f97316', Moderate: '#eab308', Low: '#22c55e' }
const STATUS_COLORS   = { Pending: '#6366f1', Approved: '#22c55e', Dispatched: '#3b82f6', Delivered: '#10b981', Rejected: '#ef4444' }

function StatCard({ icon: Icon, label, value, color, sub, link }) {
  const el = (
    <div className="card flex items-center gap-4 hover:border-slate-700 transition-colors">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  )
  return link ? <Link to={link}>{el}</Link> : el
}

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i) => <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {Number(p.value).toLocaleString()}</p>)}
    </div>
  )
}

export default function Dashboard() {
  const [s, setS] = useState(null)
  const [charts, setCharts] = useState({ sev: [], res: [], alloc: [] })

  useEffect(() => {
    Promise.all([dashAPI.summary(), dashAPI.severity(), dashAPI.resources(), dashAPI.allocation()])
      .then(([sum, sev, res, alloc]) => {
        setS(sum.data)
        setCharts({ sev: sev.data, res: res.data, alloc: alloc.data })
      }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Operations Dashboard</h1>
        <p className="page-sub">Live overview of all disaster relief operations</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Active Disasters"    value={s?.active_disasters}  color="bg-red-600"    sub={`${s?.total_disasters || 0} total`}  link="/disasters" />
        <StatCard icon={Users}         label="Affected People"     value={s?.total_affected?.toLocaleString()} color="bg-orange-600" sub="Across active disasters" />
        <StatCard icon={Package}       label="Resources Available" value={s?.total_available?.toLocaleString()} color="bg-blue-600"  sub={`${s?.low_stock_items || 0} low stock`} link="/resources" />
        <StatCard icon={TrendingDown}  label="Total Shortage"      value={s?.total_shortage?.toLocaleString()} color="bg-red-700"   sub="Unmet demand units" link="/allocation" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock}         label="Pending Approval"    value={s?.pending_approvals} color="bg-yellow-600" sub="Awaiting manager review" link="/allocation" />
        <StatCard icon={CheckCircle}   label="Approved"            value={s?.approved}          color="bg-green-600"  sub="Ready to dispatch" />
        <StatCard icon={Truck}         label="Dispatched"          value={s?.dispatched}         color="bg-purple-600" sub="En route to locations" />
        <StatCard icon={AlertTriangle} label="Critical Areas"      value={s?.critical_areas}    color="bg-red-800"    sub="Need immediate help" link="/areas" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Severity pie */}
        <div className="card">
          <p className="section-title mb-4">Disaster Severity</p>
          {charts.sev.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.sev} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={70} label={({ severity, count }) => `${severity}: ${count}`} labelLine={false} fontSize={11}>
                  {charts.sev.map((e, i) => <Cell key={i} fill={SEVERITY_COLORS[e.severity] || '#6b7280'} />)}
                </Pie>
                <Tooltip content={<TT />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-600 text-sm text-center py-16">No data yet</p>}
        </div>

        {/* Resources bar */}
        <div className="card">
          <p className="section-title mb-4">Resources by Category</p>
          {charts.res.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.res} margin={{ left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip content={<TT />} />
                <Bar dataKey="available" name="Available" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-600 text-sm text-center py-16">No data yet</p>}
        </div>

        {/* Allocation status pie */}
        <div className="card">
          <p className="section-title mb-4">Allocation Status</p>
          {charts.alloc.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={charts.alloc} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, count }) => `${status}: ${count}`} labelLine={false} fontSize={11}>
                  {charts.alloc.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.status] || '#6b7280'} />)}
                </Pie>
                <Tooltip content={<TT />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-slate-600 text-sm text-center py-16">No data yet</p>}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/predictions', label: '🧠 AI Severity Analysis', color: 'bg-purple-900/40 border-purple-800 hover:bg-purple-900/60' },
          { to: '/allocation',  label: '⚡ Optimize Allocation',  color: 'bg-blue-900/40 border-blue-800 hover:bg-blue-900/60' },
          { to: '/simulation',  label: '🧪 What-If Simulation',   color: 'bg-yellow-900/40 border-yellow-800 hover:bg-yellow-900/60' },
          { to: '/reports',     label: '📄 Export Reports',       color: 'bg-green-900/40 border-green-800 hover:bg-green-900/60' },
        ].map(q => (
          <Link key={q.to} to={q.to} className={`border rounded-xl p-4 text-sm font-medium text-slate-200 transition-all ${q.color}`}>
            {q.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
