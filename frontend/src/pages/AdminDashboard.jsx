import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

// ─── Tiny modal wrapper ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────
function MembersTab({ plans, trainers }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'freeze' | 'renew'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get('/api/admin');
    setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  function openModal(type, member = null) {
    setErr(''); setMsg(''); setForm({});
    setSelected(member);
    setModal(type);
  }

  async function addMember(e) {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.post('/api/admin', {
        name: form.name, email: form.email,
        phoneNumber: form.phoneNumber,
        planId: parseInt(form.planId),
        trainerId: form.trainerId ? parseInt(form.trainerId) : undefined
      });
      setMsg(`Member added. Payment due: Rs. ${data.payment}`);
      load();
      setModal(null);
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  async function deleteMember(id) {
    if (!confirm('Delete this member?')) return;
    await api.delete(`/api/admin/${id}`);
    load();
  }

  async function freeze(e) {
    e.preventDefault(); setErr('');
    try {
      await api.put(`/api/admin/${selected.id}/Freeze`, { frozenDuration: parseInt(form.days) });
      setModal(null); load();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  async function unfreeze(id) {
    try { await api.put(`/api/admin/${id}/Unfreeze`); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); }
  }

  async function renew(e) {
    e.preventDefault(); setErr('');
    try {
      const { data } = await api.put(`/api/admin/${selected.id}/Renew`, {
        planId: parseInt(form.planId),
        trainerId: form.trainerId ? parseInt(form.trainerId) : undefined
      });
      setMsg(`Renewed. Payment: Rs. ${data.payment}`);
      setModal(null); load();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  async function updateSessionCount(id) {
    try { await api.put(`/api/admin/${id}/update-session-count`); load(); }
    catch (e) { alert(e.response?.data?.message || 'Failed'); }
  }

  if (loading) return <p>Loading members…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ margin: 0 }}>Members ({members.length})</h2>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => openModal('add')}>
          + Add Member
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Plan</th><th>Trainer</th>
              <th>Sessions</th><th>Status</th><th>End Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td>{m.email}</td>
                <td>{m.planName?.split('(')[0].trim()}</td>
                <td>{m.trainerName}</td>
                <td>{m.sessionCount} / {m.maxSessions}</td>
                <td>
                  {m.isFrozen
                    ? <span className="badge badge-blue">Frozen</span>
                    : m.isActive
                    ? <span className="badge badge-green">Active</span>
                    : <span className="badge badge-red">Expired</span>}
                </td>
                <td>{m.endDate ? new Date(m.endDate).toLocaleDateString() : '-'}</td>
                <td>
                  <div className="flex gap-2">
                    {m.isActive && !m.isFrozen && (
                      <button className="btn-warning btn-sm" onClick={() => openModal('freeze', m)}>Freeze</button>
                    )}
                    {m.isFrozen && (
                      <button className="btn-success btn-sm" onClick={() => unfreeze(m.id)}>Unfreeze</button>
                    )}
                    {!m.isActive && (
                      <button className="btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => openModal('renew', m)}>Renew</button>
                    )}
                    {m.maxSessions !== 'Unlimited' && (
                      <button className="btn-success btn-sm" onClick={() => updateSessionCount(m.id)}>+Session</button>
                    )}
                    <button className="btn-danger btn-sm" onClick={() => deleteMember(m.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No members yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'add' && (
        <Modal title="Add Member" onClose={() => setModal(null)}>
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={addMember}>
            {[['Name','name','text'],['Email','email','email'],['Phone','phoneNumber','text']].map(([l,k,t]) => (
              <div className="form-group" key={k}>
                <label>{l}</label>
                <input type={t} value={form[k]||''} onChange={set(k)} required />
              </div>
            ))}
            <div className="form-group">
              <label>Plan</label>
              <select value={form.planId||''} onChange={set('planId')} required>
                <option value="">Select plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — Rs.{p.price}/mo</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Trainer (optional)</label>
              <select value={form.trainerId||''} onChange={set('trainerId')}>
                <option value="">No trainer</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name} — {t.specialization}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" style={{ background:'var(--primary)',color:'#fff' }}>Add Member</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'freeze' && selected && (
        <Modal title={`Freeze ${selected.name}`} onClose={() => setModal(null)}>
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={freeze}>
            <div className="form-group">
              <label>Freeze duration (days)</label>
              <input type="number" min="1" value={form.days||''} onChange={set('days')} required />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-warning">Freeze</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === 'renew' && selected && (
        <Modal title={`Renew ${selected.name}`} onClose={() => setModal(null)}>
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={renew}>
            <div className="form-group">
              <label>New Plan</label>
              <select value={form.planId||''} onChange={set('planId')} required>
                <option value="">Select plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} — Rs.{p.price}/mo</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Trainer (optional)</label>
              <select value={form.trainerId||''} onChange={set('trainerId')}>
                <option value="">No trainer</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Renew</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────
function PlansTab({ plans, reload }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function createPlan(e) {
    e.preventDefault(); setErr('');
    try {
      await api.post('/api/plan', {
        name: form.name,
        isSessional: form.isSessional === 'true',
        numberOfSessions: form.isSessional === 'true' ? parseInt(form.numberOfSessions) : -1,
        duration: form.isSessional === 'true' ? 1 : parseInt(form.duration),
        price: parseFloat(form.price)
      });
      setModal(null); reload();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  async function deletePlan(id) {
    if (!confirm('Delete plan?')) return;
    await api.delete(`/api/plan/${id}`);
    reload();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ margin: 0 }}>Plans ({plans.length})</h2>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => { setErr(''); setForm({}); setModal('add'); }}>
          + New Plan
        </button>
      </div>

      <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Type</th><th>Duration / Sessions</th><th>Price (Rs)</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td>
                <td>
                  {p.isSessional
                    ? <span className="badge badge-blue">Sessional</span>
                    : <span className="badge badge-green">Monthly</span>}
                </td>
                <td>{p.isSessional ? `${p.numberOfSessions} sessions` : `${p.duration} month(s)`}</td>
                <td>{p.price}</td>
                <td>
                  <button className="btn-danger btn-sm" onClick={() => deletePlan(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No plans yet</td></tr>}
          </tbody>
        </table>
      </div>

      {modal === 'add' && (
        <Modal title="Create Plan" onClose={() => setModal(null)}>
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={createPlan}>
            <div className="form-group">
              <label>Plan Name</label>
              <input value={form.name||''} onChange={set('name')} required />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.isSessional||'false'} onChange={set('isSessional')}>
                <option value="false">Monthly (time-based)</option>
                <option value="true">Sessional</option>
              </select>
            </div>
            {form.isSessional === 'true' ? (
              <div className="form-group">
                <label>Number of Sessions</label>
                <input type="number" min="1" value={form.numberOfSessions||''} onChange={set('numberOfSessions')} required />
              </div>
            ) : (
              <div className="form-group">
                <label>Duration (months)</label>
                <input type="number" min="1" value={form.duration||''} onChange={set('duration')} required />
              </div>
            )}
            <div className="form-group">
              <label>Price (Rs)</label>
              <input type="number" min="0" step="0.01" value={form.price||''} onChange={set('price')} required />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" style={{ background:'var(--primary)',color:'#fff' }}>Create</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Trainers Tab ─────────────────────────────────────────────────────────────
function TrainersTab({ trainers, reload }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [err, setErr] = useState('');

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function deleteTrainer(id) {
    if (!confirm('Delete this trainer? They will be unlinked from all their members.')) return;
    try {
      await api.delete(`/api/trainer/${id}`);
      reload();
    } catch (e) { alert(e.response?.data?.message || 'Failed to delete trainer'); }
  }

  async function addTrainer(e) {
    e.preventDefault(); setErr('');
    try {
      await api.post('/api/trainer', form);
      setModal(false); reload();
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 style={{ margin: 0 }}>Trainers ({trainers.length})</h2>
        <button className="btn-primary" style={{ width: 'auto' }} onClick={() => { setErr(''); setForm({}); setModal(true); }}>
          + Add Trainer
        </button>
      </div>

      <div className="table-wrap card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Name</th><th>Specialization</th><th>Phone</th><th>Actions</th></tr></thead>
          <tbody>
            {trainers.map(t => (
              <tr key={t.id}>
                <td><strong>{t.name}</strong></td>
                <td>{t.specialization}</td>
                <td>{t.phoneNumber}</td>
                <td><button className="btn-danger btn-sm" onClick={() => deleteTrainer(t.id)}>Delete</button></td>
              </tr>
            ))}
            {trainers.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No trainers yet</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Add Trainer" onClose={() => setModal(false)}>
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={addTrainer}>
            {[['Name','name'],['Specialization','specialization'],['Phone','phoneNumber']].map(([l,k]) => (
              <div className="form-group" key={k}>
                <label>{l}</label>
                <input value={form[k]||''} onChange={set(k)} required />
              </div>
            ))}
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button type="submit" style={{ background:'var(--primary)',color:'#fff' }}>Add</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Admin Dashboard shell ────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('members');
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);

  const loadPlans    = useCallback(async () => { const { data } = await api.get('/api/plan');    setPlans(data); }, []);
  const loadTrainers = useCallback(async () => { const { data } = await api.get('/api/trainer'); setTrainers(data); }, []);

  useEffect(() => { loadPlans(); loadTrainers(); }, [loadPlans, loadTrainers]);

  function handleLogout() { logout(); navigate('/login'); }

  const tabs = [
    { id: 'members',  label: '👥 Members' },
    { id: 'plans',    label: '📋 Plans' },
    { id: 'trainers', label: '🏋 Trainers' },
  ];

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h1>MyGym Admin</h1>
        {tabs.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <p className="text-muted" style={{ fontSize: '.8rem', marginBottom: '.5rem', color: '#94a3b8' }}>
            {user?.username}
          </p>
          <button className="logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        {tab === 'members'  && <MembersTab plans={plans} trainers={trainers} />}
        {tab === 'plans'    && <PlansTab plans={plans} reload={loadPlans} />}
        {tab === 'trainers' && <TrainersTab trainers={trainers} reload={loadTrainers} />}
      </main>
    </div>
  );
}
