import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { buildApiUrl } from '../config/api'

interface LoginResponse {
  access_token: string
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Identifiants incorrects.')
        } else if (response.status >= 500) {
          setError('Le serveur est indisponible. Veuillez réessayer plus tard.')
        } else {
          setError('La requête de connexion est invalide.')
        }
        setIsSubmitting(false)
        return
      }

      const data = (await response.json()) as LoginResponse
      login(data.access_token)
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Impossible de se connecter. Veuillez réessayer.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F4F4F4] font-sans">
      <div className="bg-white shadow-md rounded-lg p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-bold text-3xl text-[#0096D6] mb-1">HP | Gestion de Stock</h1>
          <p className="text-sm text-[#555555]">Outil interne — Accès restreint</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-[#1A1A1A]">Nom d&apos;utilisateur</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setError(null)
              }}
              autoComplete="username"
              required
              className="border border-[#E0E0E0] rounded-md p-3 w-full text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#1A1A1A]">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError(null)
              }}
              autoComplete="current-password"
              required
              className="border border-[#E0E0E0] rounded-md p-3 w-full text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6]"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-[#0096D6] text-white hover:bg-[#007AB8] transition-colors py-3 rounded-md font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
          </button>
        </form>
        {error ? <p role="alert" className="mt-4 text-center text-sm font-medium text-[#CC0000]">{error}</p> : null}
      </div>
    </main>
  )
}
