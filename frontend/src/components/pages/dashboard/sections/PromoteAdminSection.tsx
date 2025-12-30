import { useState } from 'react';
import { adminApi } from '../services/adminApi';

const PromoteAdminSection = () => {
  const [promoteUid, setPromoteUid] = useState('');
  const [promoteMsg, setPromoteMsg] = useState('');

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteMsg('');
    try {
      await adminApi.promoteToAdmin(promoteUid);
      setPromoteMsg('User promoted to admin!');
      setPromoteUid('');
    } catch (err: any) {
      setPromoteMsg(err?.response?.data?.error || 'Promotion failed');
    }
  };

  return (
    <div className="admin-promotion-section">
      <h2>Promote User to Admin</h2>
      <form onSubmit={handlePromoteAdmin} className="admin-form">
        <div className="form-group"><input type="text" placeholder="Firebase UID" value={promoteUid} onChange={e => setPromoteUid(e.target.value)} required /></div>
        <button type="submit" className="form-button">Promote to Admin</button>
        {promoteMsg && <div className={promoteMsg.includes('failed') ? "error-message" : "success-message"}>{promoteMsg}</div>}
      </form>
    </div>
  );
};

export default PromoteAdminSection;
