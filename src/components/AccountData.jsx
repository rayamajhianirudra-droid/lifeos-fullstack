import { useState } from 'react';
import axios from 'axios';
import Icon from './Icon';

// Profile > Your data: download everything, or delete the account for good.
// Deleting needs the password and the word DELETE; the server checks both.
export default function AccountData({ api, token, onDeleted }) {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const download = async () => {
    setBusy('export'); setNote('');
    try {
      const res = await axios.get(`${api}/account/export`, { ...auth, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNote('Your data was downloaded.');
    } catch (e) {
      setNote(e.response?.status === 429 ? 'You can download your data 5 times an hour. Please try again later.' : 'Could not download your data. Please try again.');
    } finally { setBusy(''); }
  };

  const remove = async (e) => {
    e.preventDefault();
    setError('');
    if (confirm !== 'DELETE') { setError('Type DELETE in capital letters to confirm.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    setBusy('delete');
    try {
      await axios.delete(`${api}/account`, { ...auth, data: { password, confirm } });
      setPassword('');
      onDeleted();
    } catch (err) {
      const s = err.response?.status;
      setError(s === 403 ? 'Password is incorrect.' : s === 429 ? 'Too many attempts. Please wait 15 minutes.'
        : err.response?.data?.error || 'Could not delete your account. Please try again.');
    } finally { setBusy(''); }
  };

  return (
    <section className="profile-card account-data" aria-labelledby="account-data-title">
      <h3 className="profile-title" id="account-data-title">Your data</h3>
      <p className="profile-sub">
        Download everything LifeOS stores about you, or delete your account. Read our <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.
      </p>
      <div className="account-data-actions">
        <button type="button" className="account-btn" onClick={download} disabled={busy === 'export'}>
          <Icon name="download" size={16} /> {busy === 'export' ? 'Preparing…' : 'Download my data'}
        </button>
        {!open && (
          <button type="button" className="account-btn is-danger" onClick={() => { setOpen(true); setError(''); }}>
            <Icon name="lock" size={16} /> Delete account
          </button>
        )}
      </div>
      {note && <p className="account-note" role="status">{note}</p>}

      {open && (
        <form className="account-delete" onSubmit={remove}>
          <p className="account-warning">
            This permanently deletes your account and all your logs, custom foods, plans and reminders. It cannot be undone.
            Download your data first if you want to keep a copy.
          </p>
          <label htmlFor="del-password">Password</label>
          <input id="del-password" type="password" autoComplete="current-password" className="profile-input"
            value={password} onChange={e => setPassword(e.target.value)} maxLength={200} />
          <label htmlFor="del-confirm">Type DELETE to confirm</label>
          <input id="del-confirm" type="text" autoComplete="off" className="profile-input"
            value={confirm} onChange={e => setConfirm(e.target.value)} maxLength={10} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="account-data-actions">
            <button type="submit" className="account-btn is-danger-solid" disabled={busy === 'delete'}>
              {busy === 'delete' ? 'Deleting…' : 'Delete my account forever'}
            </button>
            <button type="button" className="account-btn" onClick={() => { setOpen(false); setPassword(''); setConfirm(''); setError(''); }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
