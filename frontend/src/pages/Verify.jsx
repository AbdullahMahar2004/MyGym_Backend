import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function Verify() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!state?.email) {
    navigate('/register');
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/verify', { ...state, code: parseInt(code) });
      setSuccess('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="card card-wide">
        <h1 style={{ marginBottom: '.25rem' }}>Verify Email</h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Check the console / terminal for your 4-digit code sent to{' '}
          <strong>{state.email}</strong>
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="number"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
              placeholder="4-digit code"
              maxLength={4}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify & Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
