import lzaIcon from '../../../assets/logos/LZA ICON.png';

const STEP_LABELS = ['Store', 'Receipt', 'Delivery', 'Payment'] as const;

interface OrderProgressProps {
  /** Current funnel step, 1–4 */
  step: number;
  /**
   * Pass true when rendered over the dark map background (step 1).
   * Switches label / node colours to white-on-dark variants.
   */
  dark?: boolean;
}

/**
 * Horizontal 4-step progress tracker for the wholesale order funnel.
 * The gold (#ffb803) line advances as the user moves through steps and
 * the LZA icon marks the current step.
 */
const OrderProgress = ({ step, dark = false }: OrderProgressProps) => {
  // Fill width: 0 % at step 1, 100 % at step 4
  const fillPct = ((step - 1) / 3) * 100;

  return (
    <div
      className={`op-track${dark ? ' op-track--dark' : ''}`}
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={4}
      aria-label={`Order step ${step} of 4`}
    >
      <div className="op-nodes">
        {/* Rail — sits behind the nodes */}
        <div className="op-rail">
          <div
            className="op-rail-fill"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {STEP_LABELS.map((label, i) => {
          const nodeStep = i + 1;
          const isCompleted = nodeStep < step;
          const isCurrent = nodeStep === step;

          const nodeClass = [
            'op-node',
            isCompleted ? 'op-node--done' : '',
            isCurrent ? 'op-node--current' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={label} className="op-node-wrap">
              <div className={nodeClass}>
                {isCurrent && (
                  <img
                    src={lzaIcon}
                    alt=""
                    className="op-node-icon"
                    aria-hidden="true"
                  />
                )}
                {isCompleted && (
                  <span className="op-node-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </div>

              <span
                className={`op-label${isCurrent ? ' op-label--current' : ''}${isCompleted ? ' op-label--done' : ''}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderProgress;
