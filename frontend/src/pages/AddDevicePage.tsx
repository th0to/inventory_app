import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function AddDevicePage() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <h1>Ajouter un appareil</h1>
      <p>Accès protégé — rôle: {role ?? 'N/A'}</p>
      <nav>
        <Link to="/dashboard">Dashboard</Link> | <Link to="/inventory">Inventaire</Link> |{' '}
        <Link to="/add-device">Ajouter un appareil</Link>
      </nav>
      <button type="button" onClick={handleLogout}>
        Se déconnecter
      </button>
    </main>
  )
}
