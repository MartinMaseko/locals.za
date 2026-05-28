import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './calculatorStyle.css';

// ── LocalsZA pricing model (mirrors PricingConfig defaults) ──────────────────
const BASE_FARE   = 35;
const FUEL_LEVY   = 10;
const WEIGHT_OPTS = [
  { id: 'light',  label: 'Light',   hint: '< 5 kg',   perKm: 5, weightFee:  0 },
  { id: 'medium', label: 'Medium',  hint: '5–15 kg',  perKm: 6, weightFee: 15 },
  { id: 'heavy',  label: 'Heavy',   hint: '15–30 kg', perKm: 7, weightFee: 25 },
  { id: 'bulk',   label: 'Bulk',    hint: '30+ kg',   perKm: 8, weightFee: 40 },
] as const;

type WeightId = (typeof WEIGHT_OPTS)[number]['id'];

const WEEKS_PER_MONTH = 4.33;
const rand = (n: number) => `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CalculatorPage() {
  const navigate = useNavigate();

  // ── Customer's current setup ──────────────────────────────────────────────
  const [transportCost, setTransportCost] = useState<string>('');
  const [tripsPerWeek,  setTripsPerWeek]  = useState<string>('');

  // ── LocalsZA estimate inputs ──────────────────────────────────────────────
  const [distanceKm,   setDistanceKm]  = useState(8);
  const [weightClass,  setWeightClass] = useState<WeightId>('medium');

  // ── Derived numbers ───────────────────────────────────────────────────────
  const results = useMemo(() => {
    const cost  = parseFloat(transportCost) || 0;
    const trips = parseFloat(tripsPerWeek)  || 0;
    if (!cost || !trips) return null;

    const wt  = WEIGHT_OPTS.find(w => w.id === weightClass)!;
    const lzaFee  = BASE_FARE + FUEL_LEVY + wt.perKm * distanceKm + wt.weightFee;

    const theirWeekly  = cost * trips;
    const lzaWeekly    = lzaFee * trips;
    const theirMonthly = theirWeekly * WEEKS_PER_MONTH;
    const lzaMonthly   = lzaWeekly  * WEEKS_PER_MONTH;
    const saveWeekly   = theirWeekly - lzaWeekly;
    const saveMonthly  = theirMonthly - lzaMonthly;
    const savePct      = theirWeekly > 0 ? (saveWeekly / theirWeekly) * 100 : 0;

    return { lzaFee, theirWeekly, lzaWeekly, theirMonthly, lzaMonthly, saveWeekly, saveMonthly, savePct };
  }, [transportCost, tripsPerWeek, distanceKm, weightClass]);

  const ready  = results !== null;
  const saving = ready && results.saveMonthly > 0;

  return (
    <div className="calc-page">

      {/* ── Hero ── */}
      <div className="calc-hero">
        <p className="calc-hero-eyebrow">LocalsZA Savings Calculator</p>
      </div>

      <div className="calc-body">

        {/* ── Column 1: Inputs ── */}
        <div className="calc-inputs">

          {/* Section A — Current costs */}
          <div className="calc-card">
            <p className="calc-card-label">YOUR CURRENT TRANSPORT</p>
            <h2 className="calc-card-title">What are you paying now?</h2>

            <div className="calc-field">
              <label className="calc-field-label">Cost per trip (bakkie hire, taxi, petrol…)</label>
              <div className="calc-rand-wrap">
                <span className="calc-rand-prefix">R</span>
                <input
                  className="calc-input"
                  type="number"
                  min="0"
                  placeholder="e.g. 350"
                  value={transportCost}
                  onChange={e => setTransportCost(e.target.value)}
                />
              </div>
            </div>

            <div className="calc-field">
              <label className="calc-field-label">Restock trips per week</label>
              <div className="calc-stepper">
                <button
                  className="calc-step-btn"
                  onClick={() => setTripsPerWeek(t => String(Math.max(1, (parseInt(t) || 1) - 1)))}
                  aria-label="Decrease"
                >−</button>
                <input
                  className="calc-input calc-input--center"
                  type="number"
                  min="1"
                  max="14"
                  placeholder="1"
                  value={tripsPerWeek}
                  onChange={e => setTripsPerWeek(e.target.value)}
                />
                <button
                  className="calc-step-btn"
                  onClick={() => setTripsPerWeek(t => String((parseInt(t) || 0) + 1))}
                  aria-label="Increase"
                >+</button>
              </div>
            </div>
          </div>

          {/* Section B — LocalsZA estimate */}
          <div className="calc-card">
            <p className="calc-card-label">LOCALSZA DELIVERY ESTIMATE</p>
            <h2 className="calc-card-title">Dial in your delivery</h2>

            <div className="calc-field">
              <label className="calc-field-label">
                Distance from store to your business
                <span className="calc-km-badge">{distanceKm} km</span>
              </label>
              <input
                className="calc-slider"
                type="range"
                min={2}
                max={30}
                step={0.5}
                value={distanceKm}
                onChange={e => setDistanceKm(parseFloat(e.target.value))}
              />
              <div className="calc-slider-ticks">
                <span>2 km</span><span>~15 km</span><span>30 km</span>
              </div>
            </div>

            <div className="calc-field">
              <label className="calc-field-label">Order weight class</label>
              <div className="calc-weight-grid">
                {WEIGHT_OPTS.map(w => (
                  <button
                    key={w.id}
                    className={`calc-weight-btn${weightClass === w.id ? ' calc-weight-btn--active' : ''}`}
                    onClick={() => setWeightClass(w.id)}
                  >
                    <span className="calc-weight-label">{w.label}</span>
                    <span className="calc-weight-hint">{w.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated single-trip fee */}
            <div className="calc-trip-preview">
              <span className="calc-trip-label">Estimated LocalsZA fee per trip</span>
              <span className="calc-trip-fee">
                {rand(BASE_FARE + FUEL_LEVY
                  + WEIGHT_OPTS.find(w => w.id === weightClass)!.perKm * distanceKm
                  + WEIGHT_OPTS.find(w => w.id === weightClass)!.weightFee)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Column 2: Results ── */}
        <div className={`calc-results${ready ? ' calc-results--ready' : ''}`}>

          {!ready && (
            <div className="calc-empty">
              <p>Fill in your current transport cost and weekly trips to see your savings.</p>
            </div>
          )}

          {ready && (
            <>
              {/* Comparison table */}
              <div className="calc-compare">
                <div className="calc-compare-col calc-compare-col--them">
                  <p className="calc-compare-heading">Your Transport</p>
                  <div className="calc-compare-block">
                    <span className="calc-compare-period">Per Week</span>
                    <span className="calc-compare-amount calc-compare-amount--them">
                      {rand(results.theirWeekly)}
                    </span>
                  </div>
                  <div className="calc-compare-block">
                    <span className="calc-compare-period">Per Month</span>
                    <span className="calc-compare-amount calc-compare-amount--them">
                      {rand(results.theirMonthly)}
                    </span>
                  </div>
                </div>

                <div className="calc-compare-vs">VS</div>

                <div className="calc-compare-col calc-compare-col--lza">
                  <p className="calc-compare-heading">LocalsZA</p>
                  <div className="calc-compare-block">
                    <span className="calc-compare-period">Per Week</span>
                    <span className="calc-compare-amount calc-compare-amount--lza">
                      {rand(results.lzaWeekly)}
                    </span>
                  </div>
                  <div className="calc-compare-block">
                    <span className="calc-compare-period">Per Month</span>
                    <span className="calc-compare-amount calc-compare-amount--lza">
                      {rand(results.lzaMonthly)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings callout */}
              <div className={`calc-savings${saving ? ' calc-savings--positive' : ' calc-savings--neutral'}`}>
                {saving ? (
                  <>
                    <p className="calc-savings-label">YOU SAVE EVERY MONTH</p>
                    <p className="calc-savings-amount">{rand(results.saveMonthly)}</p>
                    <p className="calc-savings-sub">
                      That's {rand(results.saveWeekly)} a week —{' '}
                      <strong>{results.savePct.toFixed(0)}% less</strong> than what you're
                      spending now.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="calc-savings-label">COST COMPARISON</p>
                    <p className="calc-savings-amount calc-savings-amount--neutral">
                      {rand(Math.abs(results.saveMonthly))}
                    </p>
                    <p className="calc-savings-sub">
                      LocalsZA costs a little more per month at this distance — try adjusting
                      the distance or weight class, or consider the time and effort you save.
                    </p>
                  </>
                )}
              </div>

              {/* What you keep */}
              {saving && (
                <div className="calc-breakdown">
                  <p className="calc-breakdown-title">Where the savings come from</p>
                  <div className="calc-breakdown-row">
                    <span>Your annual transport spend</span>
                    <span>{rand(results.theirMonthly * 12)}</span>
                  </div>
                  <div className="calc-breakdown-row">
                    <span>LocalsZA annual cost</span>
                    <span>{rand(results.lzaMonthly * 12)}</span>
                  </div>
                  <div className="calc-breakdown-row calc-breakdown-row--highlight">
                    <span>Annual saving</span>
                    <span>{rand(results.saveMonthly * 12)}</span>
                  </div>
                  <p className="calc-breakdown-note">
                    * Calculated at {WEEKS_PER_MONTH} weeks per month. LocalsZA fee
                    includes base fare, fuel levy, distance rate and weight surcharge.
                    Final quote may vary.
                  </p>
                </div>
              )}

              {/* CTA */}
              <button
                className="calc-cta"
                onClick={() => navigate('/order/select-store')}
              >
                Place your first order
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
