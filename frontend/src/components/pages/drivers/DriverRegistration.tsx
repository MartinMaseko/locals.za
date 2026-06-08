import { useState } from 'react';
import axios from 'axios';
import logoWhite from '../../assets/logos/LZAWHTTRP.webp';
import './driverRegistration.css';

const API_URL = import.meta.env.VITE_API_URL as string;

const SA_BANKS = [
  { name: 'Absa',                      branch: '632005' },
  { name: 'African Bank',              branch: '430000' },
  { name: 'Bidvest Bank',              branch: '462005' },
  { name: 'Capitec Bank',              branch: '470010' },
  { name: 'Discovery Bank',            branch: '679000' },
  { name: 'FNB (First National Bank)', branch: '250655' },
  { name: 'Investec',                  branch: '580105' },
  { name: 'Nedbank',                   branch: '198765' },
  { name: 'Standard Bank',             branch: '051001' },
  { name: 'TymeBank',                  branch: '678910' },
];

const VEHICLE_TYPES = ['Bakkie', 'Van', 'Truck', 'Motorbike'];
const ACCOUNT_TYPES = ['Cheque / Current', 'Savings', 'Transmission'];

type FormFields = {
  firstName: string; surname: string; idNumber: string;
  phoneNumber: string; email: string;
  vehicleType: string; loadCapacity: string;
  bankName: string; accountType: string; accountNumber: string; branchCode: string;
};

const EMPTY: FormFields = {
  firstName: '', surname: '', idNumber: '', phoneNumber: '', email: '',
  vehicleType: 'Bakkie', loadCapacity: '',
  bankName: 'Absa', accountType: 'Cheque / Current', accountNumber: '', branchCode: '632005',
};

const DriverRegistration = () => {
  const [form, setForm]               = useState<FormFields>(EMPTY);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [proofFile, setProofFile]     = useState<File | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [submitted, setSubmitted]     = useState(false);

  const set = (k: keyof FormFields, v: string) =>
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'bankName') {
        const bank = SA_BANKS.find(b => b.name === v);
        if (bank) next.branchCode = bank.branch;
      }
      return next;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseFile) { setError("Driver's licence document is required."); return; }
    if (!proofFile)   { setError('Proof of residence document is required.'); return; }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    (Object.entries(form) as [string, string][]).forEach(([k, v]) => fd.append(k, v));
    fd.append('license', licenseFile);
    fd.append('proof', proofFile);

    try {
      await axios.post(`${API_URL}/api/drivers/apply`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Submission failed. Please check your connection and try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="dreg-page">
        <div className="dreg-content dreg-content--centered">
          <img src={logoWhite} alt="LocalsZA" className="dreg-logo" />
          <div className="dreg-success-card">
            <div className="dreg-success-checkmark">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <circle cx="20" cy="20" r="19" stroke="#FFB803" strokeWidth="2"/>
                <path d="M12 20.5L17.5 26L28 15" stroke="#FFB803" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="dreg-success-title">Application Received</h2>
            <p className="dreg-success-body">
              Thank you for applying to join the LocalsZA driver fleet. Here's what happens next:
            </p>
            <ol className="dreg-steps">
              <li className="dreg-step">
                <span className="dreg-step__num">1</span>
                <span className="dreg-step__text">Our team reviews your documents — usually within <strong>2 business days</strong>.</span>
              </li>
              <li className="dreg-step">
                <span className="dreg-step__num">2</span>
                <span className="dreg-step__text">We'll contact you via phone or email with your <strong>Driver ID and PIN</strong>.</span>
              </li>
              <li className="dreg-step">
                <span className="dreg-step__num">3</span>
                <span className="dreg-step__text">Use those credentials to sign in at <strong>/driverlogin</strong> and start accepting jobs.</span>
              </li>
            </ol>
            <p className="dreg-success-contact">
              Questions? Email us at{' '}
              <a href="mailto:admin@locals-za.co.za" className="dreg-success-email">
                admin@locals-za.co.za
              </a>
            </p>
            <a href="/driverlogin" className="dreg-btn dreg-btn--full">
              Go to Driver Login
            </a>
            <a href="/" className="dreg-link">← Back to Store</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dreg-page">
      <div className="dreg-content">

        {/* ── Header ── */}
        <div className="dreg-header">
          <img src={logoWhite} alt="LocalsZA" className="dreg-logo" />
          <h1 className="dreg-title">Become a LocalsZA Driver</h1>
          <p className="dreg-subtitle">
            Join the LocalsZA fleet. Fill in your details and upload the required documents —
            we'll be in touch within 2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="dreg-form">

          {/* ── Personal Information ── */}
          <div className="dreg-section">
            <h3 className="dreg-section-title">Personal Information</h3>
            <div className="dreg-grid">
              <div className="dreg-field">
                <label className="dreg-label">First Name *</label>
                <input
                  className="dreg-input"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  placeholder="e.g. Sipho"
                  required
                />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Surname *</label>
                <input
                  className="dreg-input"
                  value={form.surname}
                  onChange={e => set('surname', e.target.value)}
                  placeholder="e.g. Nkosi"
                  required
                />
              </div>
              <div className="dreg-field dreg-field--full">
                <label className="dreg-label">SA ID Number *</label>
                <input
                  className="dreg-input"
                  value={form.idNumber}
                  onChange={e => set('idNumber', e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="13-digit ID number"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Phone Number *</label>
                <input
                  className="dreg-input"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={e => set('phoneNumber', e.target.value)}
                  placeholder="+27 82 123 4567"
                  required
                />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Email Address</label>
                <input
                  className="dreg-input"
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@email.com"
                />
              </div>
            </div>
          </div>

          {/* ── Documents ── */}
          <div className="dreg-section">
            <h3 className="dreg-section-title">Documents</h3>
            <p className="dreg-section-hint">Accepted: images (JPG, PNG) or PDF — max 10 MB each.</p>
            <div className="dreg-docs-grid">
              <div className="dreg-field">
                <label className="dreg-label">Driver's Licence *</label>
                <label className="dreg-upload">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="dreg-upload__hidden"
                    onChange={e => setLicenseFile(e.target.files?.[0] ?? null)}
                  />
                  <span className={`dreg-upload__icon${licenseFile ? ' dreg-upload__icon--done' : ''}`}>
                    {licenseFile ? '✓' : '📎'}
                  </span>
                  <span className={`dreg-upload__text${licenseFile ? ' dreg-upload__text--filled' : ''}`}>
                    {licenseFile ? licenseFile.name : 'Upload driver\'s licence'}
                  </span>
                </label>
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Proof of Residence *</label>
                <label className="dreg-upload">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="dreg-upload__hidden"
                    onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                  />
                  <span className={`dreg-upload__icon${proofFile ? ' dreg-upload__icon--done' : ''}`}>
                    {proofFile ? '✓' : '📎'}
                  </span>
                  <span className={`dreg-upload__text${proofFile ? ' dreg-upload__text--filled' : ''}`}>
                    {proofFile ? proofFile.name : 'Upload proof of residence'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* ── Vehicle ── */}
          <div className="dreg-section">
            <h3 className="dreg-section-title">Vehicle Information</h3>
            <div className="dreg-grid">
              <div className="dreg-field">
                <label className="dreg-label">Vehicle Type *</label>
                <select
                  className="dreg-input"
                  value={form.vehicleType}
                  onChange={e => set('vehicleType', e.target.value)}
                  required
                >
                  {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Load Capacity *</label>
                <input
                  className="dreg-input"
                  value={form.loadCapacity}
                  onChange={e => set('loadCapacity', e.target.value)}
                  placeholder="e.g. 500 kg or 1.5 ton"
                  required
                />
              </div>
            </div>
          </div>

          {/* ── Banking ── */}
          <div className="dreg-section">
            <h3 className="dreg-section-title">Banking Details</h3>
            <p className="dreg-section-hint">
              Your payout (80% of delivery fee) will be deposited to this account.
            </p>
            <div className="dreg-grid">
              <div className="dreg-field">
                <label className="dreg-label">Bank *</label>
                <select
                  className="dreg-input"
                  value={form.bankName}
                  onChange={e => set('bankName', e.target.value)}
                  required
                >
                  {SA_BANKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Branch Code</label>
                <input className="dreg-input dreg-input--muted" value={form.branchCode} readOnly />
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Account Type *</label>
                <select
                  className="dreg-input"
                  value={form.accountType}
                  onChange={e => set('accountType', e.target.value)}
                  required
                >
                  {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="dreg-field">
                <label className="dreg-label">Account Number *</label>
                <input
                  className="dreg-input"
                  inputMode="numeric"
                  value={form.accountNumber}
                  onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter account number"
                  required
                />
              </div>
            </div>
          </div>

          {error && <div className="dreg-error">{error}</div>}

          <button type="submit" className="dreg-btn dreg-btn--full" disabled={submitting}>
            {submitting ? 'Submitting Application…' : 'Submit Application'}
          </button>

          <a href="/driverlogin" className="dreg-link">
            Already a driver? Sign in →
          </a>

        </form>
      </div>
    </div>
  );
};

export default DriverRegistration;
