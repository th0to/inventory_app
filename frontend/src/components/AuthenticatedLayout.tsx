import type { ReactNode } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { LogOut } from 'lucide-react'

interface AuthenticatedLayoutProps {
  title: string
  children?: ReactNode
}

export default function AuthenticatedLayout({ title, children }: AuthenticatedLayoutProps) {
  const { role, username, token, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const decodeUsername = () => {
    if (!token) return username;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.username || payload.name || payload.preferred_username || username;
    } catch {
      return username;
    }
  }

  const realUsername = decodeUsername() ?? 'Utilisateur';
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F4F4F4]">
      <nav className="sticky top-0 z-50 bg-[#0096D6] shadow-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-white font-bold text-xl tracking-wide">HP Stock</span>
          <div className="flex items-center gap-2">
            <Link 
              to="/dashboard" 
              className={`px-4 py-2 rounded transition-colors text-sm ${location.pathname === '/dashboard' ? 'bg-white text-[#0096D6] font-semibold' : 'text-white hover:bg-[#007AB8]'}`}
            >
              Dashboard
            </Link>
            <Link 
              to="/inventory" 
              className={`px-4 py-2 rounded transition-colors text-sm ${location.pathname === '/inventory' ? 'bg-white text-[#0096D6] font-semibold' : 'text-white hover:bg-[#007AB8]'}`}
            >
              Inventaire
            </Link>
            <Link
              to="/add-device"
              className={`px-4 py-2 rounded transition-colors text-sm ${location.pathname === '/add-device' ? 'bg-white text-[#0096D6] font-semibold' : 'text-white hover:bg-[#007AB8]'}`}
            >
              Ajouter un appareil
            </Link>
            {isAdmin && (
              <Link
                to="/users"
                className={`px-4 py-2 rounded transition-colors text-sm ${location.pathname === '/users' ? 'bg-white text-[#0096D6] font-semibold' : 'text-white hover:bg-[#007AB8]'}`}
              >
                Comptes
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-white text-sm flex items-center gap-2">
            Bonjour, {realUsername}
            {isAdmin && <span className="bg-white text-[#0096D6] text-xs font-bold px-2 py-0.5 rounded">Admin</span>}
          </div>
          <button 
            type="button" 
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 border border-white text-white rounded hover:bg-white hover:text-[#0096D6] transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </nav>

      <main className="flex-1 px-8 py-8 w-full max-w-[1400px] mx-auto">
        {title && <h1 className="font-bold text-3xl text-[#1A1A1A] mb-8">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
