const COLORS: Record<string, string> = {
  pending:          '#aaa',
  confirmed:        '#FFB803',
  complete:         '#4CAF50',
  completed:        '#4CAF50',
  delivered:        '#4CAF50',
  paid:             '#4CAF50',
  rejected:         '#ff6b6b',
  cancelled:        '#ff6b6b',
  error:            '#ff6b6b',
  assigned:         '#64b5f6',
  accepted:         '#64b5f6',
  'out-for-delivery': '#FFB803',
  'picked-up':      '#FFB803',
};

interface StatusBadgeProps { status: string; }

const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span
    className="cc-status-badge"
    style={{ background: COLORS[status] ?? '#555' }}
  >
    {status}
  </span>
);

export default StatusBadge;
