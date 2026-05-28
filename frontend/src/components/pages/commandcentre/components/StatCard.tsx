interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

const StatCard = ({ label, value, sub, accent = '#FFB803' }: StatCardProps) => (
  <div className="cc-stat-card">
    <span className="cc-stat-label">{label}</span>
    <span className="cc-stat-value" style={{ color: accent }}>{value}</span>
    {sub && <span className="cc-stat-sub">{sub}</span>}
  </div>
);

export default StatCard;
