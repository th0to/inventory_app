import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

interface AuthenticatedLayoutProps {
  title: string
  children?: ReactNode
}

export default function AuthenticatedLayout({ title, children }: AuthenticatedLayoutProps) {
  const { role, username, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <h1>{title}</h1>
      <p>Utilisateur : {username ?? 'N/A'}</p>
      <p>Rôle : {role ?? 'N/A'}</p>
      <nav>
        <Link to="/dashboard">Dashboard</Link> | <Link to="/inventory">Inventaire</Link> |{' '}
        <Link to="/add-device">Ajouter un appareil</Link>
      </nav>
      {children}
      <button type="button" onClick={handleLogout}>
        Se déconnecter
      </button>
    </main>
  )
}
