import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
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

const ADMIN_EMAIL = 'g.primucci@qiora.com.mx'

function AppShell() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ width: 36 }} />
        <span className="app-header-title">QiORA Conecta</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </header>
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
  if (user.email !== ADMIN_EMAIL) return <Navigate to="/home" replace />
  return (
    <div className="admin-layout">
      <AdminNav />
      <main className="admin-content">
        <Routes>
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/tecnicos" element={<AdminTecnicos />} />
          <Route path="/admin/sucursales" element={<AdminSucursales />} />
          <Route path="/admin/tendencia" element={<AdminTendencia />} />
          <Route path="/admin/anuncios" element={<AdminAnuncios />} />
          <Route path="/admin/upload" element={<AdminUpload />} />
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
