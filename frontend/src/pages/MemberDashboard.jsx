import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

export default function MemberDashboard() {
  const { user, memberId, logout } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null); // 'freeze' | 'renew'
  const [form, setForm] = useState({});

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  const loadMember = useCallback(async () => {
    if (!memberId) return;
    const { data } = await api.get(`/api/member/${memberId}`);
    setMember(data);
    setLoading(false);
  }, [memberId]);

  const loadNotifs = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await api.get(`/api/notifications/${user.id}`);
    setNotifications(data);
  }, [user?.id]);

  useEffect(() => {
    if (!memberId) { setLoading(false); return; }
    Promise.all([
      loadMember(),
      api.get('/api/member/plans').then(r => setPlans(r.data)),
      api.get('/api/member/trainers').then(r => setTrainers(r.data)),
      loadNotifs()
    ]);
  }, [memberId, loadMember, loadNotifs]);

  function handleLogout() { logout(); navigate('/login'); }

  async function freeze(e) {
    e.preventDefault(); setErr('');
    try {
      await api.put(`/api/member/${memberId}/freeze`, { frozenDuration: parseInt(form.days) });
      setMsg('Membership frozen successfully.'); setModal(null); loadMember();
    } catch (ex) { setErr(ex.response?.data?.message || 'Failed'); }
  }

  async function unfreeze() {
    try {
      await api.put(`/api/member/${memberId}/unfreeze`);
      setMsg('Membership unfrozen.'); loadMember();
    } catch (ex) { setErr(ex.response?.data?.message || 'Failed'); }
  }

  async function renew(e) {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.put(`/api/member/${memberId}/renew`, {
        planId: parseInt(form.planId),
        trainerId: form.trainerId ? parseInt(form.trainerId) : undefined
      });
      setMsg(`Membership renewed! Payment due: Rs. ${data.payment}`); setModal(null); loadMember();
    } catch (ex) { setErr(ex.response?.data?.message || 'Failed'); }
  }

  async function markRead(id) {
    await api.put(`/api/notifications/${id}/read`);
    loadNotifs();
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
  ];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h1>MyGym</h1>
        {tabs.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <p style={{ fontSize: '.8rem', color: '#94a3b8', marginBottom: '.5rem' }}>{user?.username}</p>
          <button className="logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        {msg && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{msg}</div>}
        {err && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{err}</div>}

        {tab === 'profile' && (
          <>
            <h2>My Membership</h2>
            {loading && <p>Loading…</p>}
            {!loading && !memberId && (
              <div className="card">
                <p>No member record linked to your account. Contact the gym admin.</p>
              </div>
            )}
            {!loading && member && (
              <>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Name</div>
                    <div className="info-value">{member.name}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Email</div>
                    <div className="info-value">{member.email}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Plan</div>
                    <div className="info-value">{member.planName?.split('(')[0].trim()}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Trainer</div>
                    <div className="info-value">{member.trainerName}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Status</div>
                    <div className="info-value">
                      {member.isFrozen
                        ? <span className="badge badge-blue">Frozen</span>
                        : member.isActive
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-red">Expired</span>}
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Sessions</div>
                    <div className="info-value">{member.sessionCount} / {member.maxSessions}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">Start Date</div>
                    <div className="info-value">{member.startDate ? new Date(member.startDate).toLocaleDateString() : '-'}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">End Date</div>
                    <div className="info-value">{member.endDate ? new Date(member.endDate).toLocaleDateString() : '-'}</div>
                  </div>
                  {member.isFrozen && (
                    <>
                      <div className="info-item">
                        <div className="info-label">Frozen From</div>
                        <div className="info-value">{member.freezeStartDate ? new Date(member.freezeStartDate).toLocaleDateString() : '-'}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Frozen Until</div>
                        <div className="info-value">{member.freezeEndDate ? new Date(member.freezeEndDate).toLocaleDateString() : '-'}</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  {member.isActive && !member.isFrozen && (
                    <button className="btn-warning" onClick={() => { setErr(''); setForm({}); setModal('freeze'); }}>
                      Freeze Membership
                    </button>
                  )}
                  {member.isFrozen && (
                    <button className="btn-success" onClick={unfreeze}>Unfreeze</button>
                  )}
                  {!member.isActive && (
                    <button
                      className="btn-primary"
                      style={{ width: 'auto' }}
                      onClick={() => { setErr(''); setForm({}); setModal('renew'); }}
                    >
                      Renew Membership
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'notifications' && (
          <>
            <h2>Notifications</h2>
            {notifications.length === 0 && <p className="text-muted">No notifications yet.</p>}
            <div className="notif-list">
              {notifications.map(n => (
                <div key={n.id} className={`notif-item${n.isRead ? '' : ' unread'}`}>
                  <div>{n.content}</div>
                  <div className="flex justify-between items-center notif-meta">
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {!n.isRead && (
                      <button className="btn-ghost btn-sm" onClick={() => markRead(n.id)}>Mark read</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {modal === 'freeze' && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="modal">
              <h2>Freeze Membership</h2>
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={freeze}>
                <div className="form-group">
                  <label>How many days to freeze?</label>
                  <input type="number" min="1" value={form.days||''} onChange={set('days')} required />
                  <span className="text-muted" style={{ fontSize: '.8rem' }}>
                    Max 1/3 of plan duration. Your end date will be extended by this many days.
                  </span>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn-warning">Freeze</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {modal === 'renew' && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="modal">
              <h2>Renew Membership</h2>
              {err && <div className="alert alert-error">{err}</div>}
              <form onSubmit={renew}>
                <div className="form-group">
                  <label>Choose Plan</label>
                  <select value={form.planId||''} onChange={set('planId')} required>
                    <option value="">Select plan</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Rs.{p.price} / {p.isSessional ? `${p.numberOfSessions} sessions` : `${p.duration} month(s)`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Trainer (optional — adds 30%)</label>
                  <select value={form.trainerId||''} onChange={set('trainerId')}>
                    <option value="">No trainer</option>
                    {trainers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} — {t.specialization}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Renew</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
