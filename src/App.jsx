import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Home from './pages/Home'
import History from './pages/History'
import WeekDetail from './pages/WeekDetail'
import Profile from './pages/Profile'
import InfoMetas from './pages/InfoMetas'
import BottomNav from './components/BottomNav'

function AuthGate({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><span>Cargando...</span></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppShell() {
  return (
    <AuthGate>
      <div className="app-shell">
        <main className="app-content">
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:weekStart" element={<WeekDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/info" element={<InfoMetas />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </AuthGate>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
