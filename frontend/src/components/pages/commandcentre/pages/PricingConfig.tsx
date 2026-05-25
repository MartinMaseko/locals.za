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

  // Weight override editor state
  const [newKey, setNewKey]     = useState('');
  const [newKg, setNewKg]       = useState('');

  useEffect(() => {
    adminApi.getPricing()
      .then(c => setConfig({ ...DEFAULT, ...c, weightOverrides: c.weightOverrides ?? {} }))
      .catch(() => { /* container may not exist yet — use defaults */ })
      .finally(() => setLoading(false));
  }, []);

  const setField = (key: keyof PricingConfigForm, val: string) =>
    setConfig(prev => ({ ...prev, [key]: key === 'petrolNote' ? val : parseFloat(val) || 0 }));

  const addOverride = () => {
    const k = newKey.trim().toLowerCase();
    const v = parseFloat(newKg);
    if (!k || isNaN(v) || v <= 0) return;
    setConfig(prev => ({ ...prev, weightOverrides: { ...prev.weightOverrides, [k]: v } }));
    setNewKey('');
    setNewKg('');
  };

  const removeOverride = (key: string) =>
    setConfig(prev => {
      const overrides = { ...prev.weightOverrides };
      delete overrides[key];
      return { ...prev, weightOverrides: overrides };
    });

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

          {/* ── Weight overrides ── */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Weight Overrides
            </h2>
            <p style={{ color: '#666', fontSize: '0.78rem', marginBottom: '1rem' }}>
              Override or add product keyword → kg/unit values used by the OCR service to classify order weight. Entries here take priority over the built-in lookup table.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.75rem' }}>Keyword</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}>kg / unit</th>
                  <th style={{ padding: '0.5rem 0.75rem' }}></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(config.weightOverrides).length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '0.75rem', color: '#999', fontStyle: 'italic' }}>
                      No overrides configured — OCR service defaults apply.
                    </td>
                  </tr>
                )}
                {Object.entries(config.weightOverrides).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{k}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{v} kg</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <button
                        className="cc-btn cc-btn--sm cc-btn--danger"
                        onClick={() => removeOverride(k)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add new override */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
              <div className="cc-form-field" style={{ flex: 2, margin: 0 }}>
                <label className="cc-form-label">Keyword (lowercase)</label>
                <input
                  type="text"
                  className="cc-form-input"
                  placeholder="e.g. energy drink"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOverride()}
                />
              </div>
              <div className="cc-form-field" style={{ flex: 1, margin: 0 }}>
                <label className="cc-form-label">kg / unit</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="cc-form-input"
                  placeholder="0.5"
                  value={newKg}
                  onChange={e => setNewKg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addOverride()}
                />
              </div>
              <button className="cc-btn cc-btn--secondary" onClick={addOverride} style={{ height: 38 }}>
                + Add
              </button>
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
