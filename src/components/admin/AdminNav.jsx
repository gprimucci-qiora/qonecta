import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/admin',            label: 'Overview',    icon: '◼' },
  { to: '/admin/operaciones', label: 'Operaciones', icon: '📊' },
  { to: '/admin/tecnicos',   label: 'Técnicos',    icon: '👥' },
  { to: '/admin/sucursales', label: 'Sucursales',  icon: '🏢' },
  { to: '/admin/tendencia',  label: 'Tendencia',   icon: '📈' },
  { to: '/admin/anuncios',   label: 'Anuncios',    icon: '📢' },
  { to: '/admin/upload',     label: 'Subir Excel', icon: '⬆' },
  { to: '/admin/gestion',   label: 'Gestión',     icon: '⚙️' },
  { to: '/admin/bot',      label: 'Bot FFM',     icon: '🤖' },
]

export default function AdminNav() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span>QiORA</span>
        <span className="admin-sidebar-sub">Admin</span>
      </div>
      <nav className="admin-sidebar-nav">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button className="admin-signout" onClick={handleSignOut}>
        Cerrar sesión
      </button>
    </aside>
  )
}
