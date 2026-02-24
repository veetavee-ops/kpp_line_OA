import { useState } from 'react'
import axios from 'axios'
import './LoginPage.css' // Reuse login styles

export default function RegisterPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [inviteCode, setInviteCode] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            const API_URL = import.meta.env.VITE_API_URL
            await axios.post(`${API_URL}/api/auth/register`, {
                username,
                password,
                inviteCode
            })

            setSuccess('✅ Admin registered successfully!')
            setUsername('')
            setPassword('')
            setInviteCode('')

            setTimeout(() => {
                window.location.href = '/'
            }, 2000)

        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon">
                        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                    </div>
                    <h1>Admin Register</h1>
                    <p>Create New Admin Account</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Invite Code</label>
                        <input
                            type="password"
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                            placeholder="Enter secret invite code"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Choose username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Choose password"
                            required
                        />
                    </div>

                    {error && <div className="error-message">⚠️ {error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Creating...' : 'Register'}
                    </button>

                    <button
                        type="button"
                        className="btn-back"
                        onClick={() => window.location.href = '/'}
                    >
                        ← Back to Login
                    </button>
                </form>
            </div>
        </div>
    )
}
