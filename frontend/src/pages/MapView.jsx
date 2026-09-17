import React, { useEffect, useState } from 'react'
import { disasterAPI, areaAPI } from '../services/api.js'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'

// Fix default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const icon = (color) => L.divIcon({
  html: `<div style="width:14px;height:14px;background:${color};border:2px solid rgba(255,255,255,.6);border-radius:50%;box-shadow:0 0 8px ${color}80"></div>`,
  className: '', iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8]
})

const SEV_COLOR = { Critical:'#ef4444', High:'#f97316', Moderate:'#eab308', Low:'#22c55e' }
const PRI_COLOR = { Critical:'#ef4444', High:'#f97316', Medium:'#eab308', Low:'#22c55e' }

export default function MapView() {
  const [disasters, setDisasters] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAreas, setShowAreas] = useState(true)
  const [showDisasters, setShowDisasters] = useState(true)

  useEffect(() => {
    Promise.all([disasterAPI.list(), areaAPI.list()])
      .then(([d, a]) => { setDisasters(d.data || []); setAreas(a.data || []) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-16 text-slate-500">Loading map…</div>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Interactive Map</h1>
        <p className="page-sub">{disasters.length} disasters · {areas.length} affected areas</p>
      </div>

      {/* Filter toggles */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: '🔴 Disasters',     active: showDisasters, toggle: () => setShowDisasters(v => !v) },
          { label: '📍 Affected Areas', active: showAreas,    toggle: () => setShowAreas(v => !v) },
        ].map(f => (
          <button key={f.label} onClick={f.toggle}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
              ${f.active ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
            {f.label}
          </button>
        ))}
        {/* Legend */}
        <div className="flex gap-3 items-center ml-auto flex-wrap">
          {Object.entries(SEV_COLOR).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-3 rounded-full" style={{ background: v }} />
              {k}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-800" style={{ height: 'calc(100vh - 240px)', minHeight: '400px' }}>
        <MapContainer center={[20.59, 78.96]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Disaster markers */}
          {showDisasters && disasters.filter(d => d.latitude && d.longitude).map(d => (
            <React.Fragment key={`d-${d.id}`}>
              <Circle
                center={[d.latitude, d.longitude]}
                radius={Math.max(15000, (d.affected_population || 1000) * 4)}
                pathOptions={{ color: SEV_COLOR[d.severity] || '#888', fillOpacity: 0.08, weight: 1 }}
              />
              <Marker position={[d.latitude, d.longitude]} icon={icon(SEV_COLOR[d.severity] || '#888')}>
                <Popup>
                  <div className="text-xs min-w-48 space-y-1">
                    <p className="font-bold text-sm">{d.name}</p>
                    <p>🌊 <strong>{d.disaster_type}</strong></p>
                    <p>⚠ Severity: <strong>{d.severity}</strong> ({d.severity_score?.toFixed(1)})</p>
                    <p>👥 Affected: {d.affected_population?.toLocaleString()}</p>
                    <p>📍 {d.location}</p>
                    <p>🔴 Status: {d.status}</p>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* Area markers */}
          {showAreas && areas.filter(a => a.latitude && a.longitude).map(a => (
            <Marker key={`a-${a.id}`} position={[a.latitude, a.longitude]} icon={icon(PRI_COLOR[a.priority_level] || '#888')}>
              <Popup>
                <div className="text-xs min-w-48 space-y-1">
                  <p className="font-bold text-sm">{a.name}</p>
                  <p>📍 {a.district}, {a.state}</p>
                  <p>⚡ Priority: <strong>{a.priority_level}</strong> ({a.priority_score?.toFixed(1)})</p>
                  <p>👥 Affected: {a.affected_population?.toLocaleString()}</p>
                  <p>🏥 Medical: {a.medical_emergencies}</p>
                  <p>🏗 Infra Damage: {a.infrastructure_damage}%</p>
                  <p>🛣 Road: {a.road_accessibility}%</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
