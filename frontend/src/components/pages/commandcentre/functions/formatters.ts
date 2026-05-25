/** Format a number as South African Rand */
export const formatRand = (amount: number): string =>
  `R ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

/** Format an ISO date string to a readable local time */
export const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

/** Truncate a string to maxLen characters with ellipsis */
export const truncate = (str: string, maxLen = 24): string =>
  str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
