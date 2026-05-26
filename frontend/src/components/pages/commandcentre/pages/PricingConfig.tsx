import { useEffect, useState } from 'react';
import { adminApi, type PricingConfigForm } from '../services/adminApi';

const DEFAULT: PricingConfigForm = {
  baseFare: 35,
  lightRatePerKm: 4.50,
  mediumRatePerKm: 6.00,
  heavyRatePerKm: 8.50,
  bulkRatePerKm: 12.00,
  lightWeightFee: 0,
  mediumWeightFee: 15,
  heavyWeightFee: 45,
  bulkWeightFee: 90,
  rushMultiplier: 1.35,
  poolDiscount: 0.80,
  minimumFare: 60,
  fuelLevy: 0,
  weightOverrides: {},
  petrolNote: '',
};

const RATE_FIELDS: { key: keyof PricingConfigForm; label: string; step?: string }[] = [
  { key: 'baseFare',         label: 'Base Fare (R)',           step: '0.50' },
  { key: 'fuelLevy',         label: 'Fuel Levy (R) — flat',   step: '0.50' },
  { key: 'lightRatePerKm',   label: 'Light Rate / km (R)',     step: '0.10' },
  { key: 'mediumRatePerKm',  label: 'Medium Rate / km (R)',    step: '0.10' },
  { key: 'heavyRatePerKm',   label: 'Heavy Rate / km (R)',     step: '0.10' },
  { key: 'bulkRatePerKm',    label: 'Bulk Rate / km (R)',      step: '0.10' },
  { key: 'lightWeightFee',   label: 'Light Weight Fee (R)',    step: '0.50' },
  { key: 'mediumWeightFee',  label: 'Medium Weight Fee (R)',   step: '0.50' },
  { key: 'heavyWeightFee',   label: 'Heavy Weight Fee (R)',    step: '0.50' },
  { key: 'bulkWeightFee',    label: 'Bulk Weight Fee (R)',     step: '0.50' },
  { key: 'rushMultiplier',   label: 'Rush Multiplier (×)',     step: '0.01' },
  { key: 'poolDiscount',     label: 'Pool Discount (×)',       step: '0.01' },
  { key: 'minimumFare',      label: 'Minimum Fare (R)',        step: '1' },
];

const PricingConfig = () => {
  const [config, setConfig]   = useState<PricingConfigForm>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    adminApi.getPricing()
      .then(c => setConfig({ ...DEFAULT, ...c, weightOverrides: c.weightOverrides ?? {} }))
      .catch(() => { /* container may not exist yet — use defaults */ })
      .finally(() => setLoading(false));
  }, []);

  const setField = (key: keyof PricingConfigForm, val: string) =>
    setConfig(prev => ({ ...prev, [key]: key === 'petrolNote' ? val : parseFloat(val) || 0 }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await adminApi.savePricing(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save pricing config.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Pricing Config</h1>
        {saved && <span style={{ color: '#4CAF50', fontSize: '0.85rem' }}>✓ Saved</span>}
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error   && <p className="cc-error">{error}</p>}

      {!loading && (
        <>
          {/* ── Rate fields ── */}
          <div className="cc-form-grid">
            {RATE_FIELDS.map(f => (
              <div key={f.key} className="cc-form-field">
                <label className="cc-form-label" htmlFor={f.key}>{f.label}</label>
                <input
                  id={f.key}
                  type="number"
                  step={f.step ?? '1'}
                  min="0"
                  className="cc-form-input"
                  value={config[f.key] as number}
                  onChange={e => setField(f.key, e.target.value)}
                />
              </div>
            ))}

            <div className="cc-form-field cc-form-note" style={{ gridColumn: '1 / -1' }}>
              <label className="cc-form-label" htmlFor="petrolNote">Petrol Note</label>
              <input
                id="petrolNote"
                type="text"
                className="cc-form-input"
                placeholder="e.g. Petrol rate updated 2026-06-01 — R1 fuel levy applied"
                value={config.petrolNote ?? ''}
                onChange={e => setField('petrolNote', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              className="cc-btn cc-btn--primary"
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth: 140 }}
            >
              {saving ? 'Saving…' : 'Save Config'}
            </button>
            <p style={{ color: '#888', fontSize: '0.72rem', margin: 0 }}>
              Changes take effect immediately for all new delivery quotes.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default PricingConfig;
