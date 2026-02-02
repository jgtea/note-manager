import { useState, type FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (isRegistering) {
      const { error } = await signUp(email, password)
      if (error) {
        console.error('Registration error:', error)
        setError(`Fout: ${error.message}`)
      } else {
        setSuccess('Account aangemaakt! Je kunt nu inloggen.')
        setIsRegistering(false)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        console.error('Login error:', error)
        setError(`Fout: ${error.message}`)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Note Manager</h1>
          <p className="text-gray-600 mt-2">
            {isRegistering ? 'Maak een nieuw account aan' : 'Log in om je taken te beheren'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition"
              placeholder="jouw@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (isRegistering ? 'Registreren...' : 'Inloggen...')
              : (isRegistering ? 'Registreren' : 'Inloggen')}
          </button>

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600 text-sm mb-2">
              {isRegistering ? 'Al een account?' : 'Nog geen account?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setError(null)
                setSuccess(null)
              }}
              className="text-yellow-600 hover:text-yellow-700 font-semibold cursor-pointer"
            >
              {isRegistering ? 'Log in' : 'Registreer hier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
