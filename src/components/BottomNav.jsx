import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/home',    icon: '⊞', label: 'Inicio' },
  { to: '/history', icon: '◷', label: 'Historia' },
  { to: '/profile', icon: '○', label: 'Perfil' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="nav-icon">{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
