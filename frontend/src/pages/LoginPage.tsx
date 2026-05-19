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
    <main>
      <h1>Connexion</h1>
      <p>Connectez-vous avec vos identifiants.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Nom d&apos;utilisateur</label>
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
        />
        <label htmlFor="password">Mot de passe</label>
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
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Connexion en cours…' : 'Se connecter'}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  )
}
