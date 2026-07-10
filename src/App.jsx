import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useAllAnnouncements } from './hooks/useOrders'
import Login from './pages/Login'
import Home from './pages/Home'
import History from './pages/History'
import WeekDetail from './pages/WeekDetail'
import Profile from './pages/Profile'
import InfoMetas from './pages/InfoMetas'
import BottomNav from './components/BottomNav'
import AdminNav from './components/admin/AdminNav'
import AdminHome from './pages/admin/AdminHome'
import AdminTecnicos from './pages/admin/AdminTecnicos'
import AdminSucursales from './pages/admin/AdminSucursales'
import AdminTendencia from './pages/admin/AdminTendencia'
import AdminAnuncios from './pages/admin/AdminAnuncios'
import AdminUpload from './pages/admin/AdminUpload'
import AdminOperaciones from './pages/admin/AdminOperaciones'
import AdminGestion from './pages/admin/AdminGestion'
import AdminBot from './pages/admin/AdminBot'

const ADMIN_EMAIL = 'g.primucci@qiora.com.mx'
function isAdmin(user) {
  return user.email === ADMIN_EMAIL || user.app_metadata?.role === 'admin'
}

const TIPO_CONFIG = {
  alerta:   { icon: '🚨', label: 'Alerta',   color: '#FF3B30', bg: '#FFF1F0', border: '#FF3B30' },
  rally:    { icon: '🎉', label: 'Rally',    color: '#1A7F37', bg: '#F0FFF5', border: '#30D158' },
  reminder: { icon: '📌', label: 'Reminder', color: '#B45309', bg: '#FFFBEB', border: '#FF9F0A' },
}

function BellPanel({ open, onClose }) {
  const { announcements, loading } = useAllAnnouncements()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [open, onClose])

  return (
    <>
      {/* Invisible overlay to catch outside taps */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={onClose}
        />
      )}

      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 56,
          right: 12,
          width: 'min(340px, calc(100vw - 24px))',
          maxHeight: '70vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          zIndex: 200,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.97)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
          transformOrigin: 'top right',
        }}
      >
        <div style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid #F2F2F7',
          fontSize: 13, fontWeight: 700, color: '#1C1C1E',
        }}>
          Avisos activos
        </div>

        {loading ? (
          <div style={{ padding: '20px 16px', color: '#8E8E93', fontSize: 13 }}>Cargando...</div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: '20px 16px', color: '#8E8E93', fontSize: 13, textAlign: 'center' }}>
            Sin avisos activos
          </div>
        ) : (
          <div style={{ padding: '8px 0' }}>
            {announcements.map((a, i) => {
              const t = TIPO_CONFIG[a.tipo] ?? TIPO_CONFIG.alerta
              return (
                <div
                  key={a.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: i < announcements.length - 1 ? '1px solid #F2F2F7' : 'none',
                  }}
                >
                  {/* Tipo chip */}
                  <div style={{ marginBottom: 6 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 9px', borderRadius: 999,
                      background: t.bg, border: `1px solid ${t.border}`,
                      fontSize: 11, fontWeight: 700, color: t.color,
                    }}>
                      {t.icon} {t.label}
                    </span>
                  </div>
                  {/* Title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: 3, lineHeight: 1.3 }}>
                    {a.titulo || 'Aviso'}
                  </div>
                  {/* Body */}
                  <div style={{ fontSize: 13, color: '#3C3C43', lineHeight: 1.5 }}>
                    {a.mensaje}
                  </div>
                  {/* Date */}
                  <div style={{ fontSize: 11, color: '#C7C7CC', marginTop: 6 }}>
                    {new Date(a.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function AppShell() {
  const { user, loading } = useAuth()
  const [bellOpen, setBellOpen] = useState(false)
  const { announcements } = useAllAnnouncements()
  const hasActive = announcements.length > 0

  if (loading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin(user)) return <Navigate to="/admin" replace />

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ width: 36 }} />
        <span className="app-header-title">QiORA Conecta</span>

        {/* Bell button */}
        <button
          onClick={() => setBellOpen(v => !v)}
          style={{
            position: 'relative', background: 'none', border: 'none',
            padding: 4, cursor: 'pointer', lineHeight: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={bellOpen ? '#1C1C1E' : '#8E8E93'} strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {hasActive && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 8, height: 8, borderRadius: '50%',
              background: '#FF3B30', border: '1.5px solid #fff',
            }} />
          )}
        </button>
      </header>

      <BellPanel open={bellOpen} onClose={() => setBellOpen(false)} />

      <div className="app-content">
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:weekStart" element={<WeekDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/info" element={<InfoMetas />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}

function AdminShell() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin(user)) return <Navigate to="/home" replace />
  return (
    <div className="admin-layout">
      <AdminNav />
      <main className="admin-content">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="operaciones" element={<AdminOperaciones />} />
          <Route path="tecnicos" element={<AdminTecnicos />} />
          <Route path="sucursales" element={<AdminSucursales />} />
          <Route path="tendencia" element={<AdminTendencia />} />
          <Route path="anuncios" element={<AdminAnuncios />} />
          <Route path="upload" element={<AdminUpload />} />
          <Route path="gestion" element={<AdminGestion />} />
          <Route path="bot" element={<AdminBot />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/*" element={<AdminShell />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
