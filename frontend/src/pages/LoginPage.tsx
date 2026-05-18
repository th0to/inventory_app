import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [jwtToken, setJwtToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      login(jwtToken.trim())
      navigate('/dashboard', { replace: true })
    } catch {
      setError('Token JWT invalide.')
    }
  }

  return (
    <main>
      <h1>Connexion</h1>
      <p>Collez votre token JWT pour ouvrir l&apos;application.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="jwt-token">Token JWT</label>
        <textarea
          id="jwt-token"
          value={jwtToken}
          onChange={(event) => {
            setJwtToken(event.target.value)
            setError(null)
          }}
          rows={6}
          required
        />
        <button type="submit">Se connecter</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  )
}
