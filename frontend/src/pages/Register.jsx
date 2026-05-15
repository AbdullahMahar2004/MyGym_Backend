import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', userName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/register', form);
      navigate('/verify', { state: { email: form.email, ...form } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  return (
    <div className="page-center">
      <div className="card card-wide">
        <h1 style={{ marginBottom: '.25rem' }}>MyGym</h1>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          Create your member account
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={form.userName} onChange={set('userName')} required placeholder="johndoe" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required placeholder="••••••••" />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending code…' : 'Send Verification Code'}
          </button>
        </form>

        <p className="text-muted" style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
