import { useEffect, useState } from 'react'
import { Pencil, Trash2, Check, X, Users as UsersIcon } from 'lucide-react'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
  type UserRole,
} from '../services/usersApi'

const baseInputClass =
  'border border-[#E0E0E0] rounded-md p-2.5 w-full text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6] bg-white disabled:bg-[#F4F4F4]'
const labelClass = 'text-sm font-medium text-[#1A1A1A] mb-1 block'

function roleBadge(role: UserRole): string {
  if (role === 'admin') return 'bg-[#0096D6]/10 text-[#0096D6]'
  if (role === 'user') return 'bg-gray-100 text-gray-800'
  return 'bg-yellow-100 text-yellow-800'
}

export default function UsersPage() {
  const { token, role, username } = useAuth()
  const isAdmin = role === 'admin'

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Création
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('user')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Édition inline
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('user')
  const [editActive, setEditActive] = useState(true)
  const [editPassword, setEditPassword] = useState('')

  const notify = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 5000)
  }

  const loadUsers = async () => {
    if (!token) {
      setError('Session invalide. Veuillez vous reconnecter.')
      setIsLoading(false)
      return
    }
    try {
      setUsers(await fetchUsers(token))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les utilisateurs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      if (!isAdmin) {
        setIsLoading(false)
        return
      }
      await loadUsers()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return
    if (!newUsername.trim() || !newEmail.trim() || !newPassword) {
      setError('Nom d’utilisateur, email et mot de passe sont obligatoires.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await createUser(token, {
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      })
      setNewUsername('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('user')
      notify('Compte créé avec succès.')
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de créer le compte.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditRole(user.role)
    setEditActive(user.is_active)
    setEditPassword('')
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPassword('')
  }

  const saveEdit = async (user: User) => {
    if (!token) return
    try {
      await updateUser(token, user.id, {
        role: editRole,
        is_active: editActive,
        ...(editPassword ? { password: editPassword } : {}),
      })
      notify(`Compte « ${user.username} » mis à jour.`)
      cancelEdit()
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de modifier le compte.')
    }
  }

  const handleDelete = async (user: User) => {
    if (!token) return
    if (!window.confirm(`Désactiver le compte « ${user.username} » ? Il ne pourra plus se connecter.`)) {
      return
    }
    try {
      await deleteUser(token, user.id)
      notify(`Compte « ${user.username} » désactivé.`)
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de désactiver le compte.')
    }
  }

  return (
    <AuthenticatedLayout title="Gestion des comptes">
      <section className="space-y-6">
        {!isAdmin ? (
          <div className="bg-[#FF6B00]/10 border border-[#FF6B00] text-[#FF6B00] px-4 py-3 rounded-md text-sm font-medium">
            Seuls les administrateurs peuvent gérer les comptes utilisateurs.
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-[#CC0000]/10 border border-[#CC0000] text-[#CC0000] px-4 py-3 rounded-md text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-[#007A33]/10 border border-[#007A33] text-[#007A33] px-4 py-3 rounded-md text-sm font-medium">
                {success}
              </div>
            )}

            {/* Formulaire de création */}
            <form onSubmit={handleCreate} className="bg-white rounded-lg shadow-sm p-6" noValidate>
              <h2 className="font-bold text-xl text-[#1A1A1A] mb-4">Créer un compte</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label>
                  <span className={labelClass}>Nom d’utilisateur <span className="text-[#CC0000]">*</span></span>
                  <input type="text" className={baseInputClass} value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={isSubmitting} />
                </label>
                <label>
                  <span className={labelClass}>Email <span className="text-[#CC0000]">*</span></span>
                  <input type="email" className={baseInputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={isSubmitting} />
                </label>
                <label>
                  <span className={labelClass}>Mot de passe <span className="text-[#CC0000]">*</span></span>
                  <input type="text" className={baseInputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSubmitting} />
                </label>
                <label>
                  <span className={labelClass}>Rôle</span>
                  <select className={baseInputClass} value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} disabled={isSubmitting}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="visitor">visitor</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end mt-4">
                <button type="submit" disabled={isSubmitting} className="bg-[#0096D6] hover:bg-[#007AB8] text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70">
                  {isSubmitting ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>

            {/* Tableau des comptes */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F4F4F4] text-[#1A1A1A] font-semibold text-sm border-b border-[#E0E0E0]">
                      <th className="px-6 py-4 font-semibold">Nom d’utilisateur</th>
                      <th className="px-6 py-4 font-semibold">Email</th>
                      <th className="px-6 py-4 font-semibold">Rôle</th>
                      <th className="px-6 py-4 font-semibold">Statut</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-[#555555]">
                    {isLoading ? (
                      <tr><td colSpan={5} className="px-6 py-16 text-center font-medium">Chargement…</td></tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <UsersIcon size={48} className="my-4 text-[#E0E0E0]" />
                            <p className="font-semibold text-lg text-[#1A1A1A]">Aucun utilisateur</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const isSelf = user.username === username
                        const isEditing = editingId === user.id
                        return (
                          <tr key={user.id} className="hover:bg-[#F4F4F4] transition-colors border-b border-[#E0E0E0] last:border-0">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-[#1A1A1A]">
                              {user.username}
                              {isSelf && <span className="ml-2 text-xs text-[#0096D6]">(vous)</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <select className={baseInputClass} value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}>
                                  <option value="user">user</option>
                                  <option value="admin">admin</option>
                                  <option value="visitor">visitor</option>
                                </select>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}>{user.role}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <label className="flex items-center gap-2">
                                  <input type="checkbox" className="w-4 h-4" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                                  <span>Actif</span>
                                </label>
                              ) : user.is_active ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Actif</span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Inactif</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-2">
                                  <input
                                    type="text"
                                    placeholder="Nouveau mot de passe (option.)"
                                    className={`${baseInputClass} w-56`}
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                  />
                                  <button type="button" onClick={() => saveEdit(user)} className="p-2 text-[#007A33] hover:bg-green-50 rounded transition-colors" title="Enregistrer">
                                    <Check size={18} />
                                  </button>
                                  <button type="button" onClick={cancelEdit} className="p-2 text-[#555555] hover:bg-gray-100 rounded transition-colors" title="Annuler">
                                    <X size={18} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button type="button" onClick={() => startEdit(user)} className="p-2 text-[#0096D6] hover:bg-blue-50 rounded transition-colors" title="Modifier">
                                    <Pencil size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(user)}
                                    disabled={isSelf}
                                    className="p-2 text-[#CC0000] hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={isSelf ? 'Vous ne pouvez pas désactiver votre propre compte' : 'Désactiver'}
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </AuthenticatedLayout>
  )
}
