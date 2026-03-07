export interface UnitPriceInfo {
  totalPrice: number;
  unitCount: number | null;
  unitPrice: number | null;
  hasMultipleUnits: boolean;
}

/**
 * Parses product name to extract unit count and calculate unit price
 */

export const calculateUnitPrice = (productName: string, totalPrice: number): UnitPriceInfo => {
  // Check if the product name contains " x " pattern (case insensitive)
  const unitPattern = /(\d+)\s*x\s*/i;
  const match = productName.match(unitPattern);
  
  if (match && match[1]) {
    const unitCount = parseInt(match[1], 10);
    
    if (unitCount > 0) {
      const unitPrice = totalPrice / unitCount;
      return {
        totalPrice,
        unitCount,
        unitPrice,
        hasMultipleUnits: true
      };
    }
  }
  
  // No "x" pattern found or invalid unit count
  return {
    totalPrice,
    unitCount: null,
    unitPrice: null,
    hasMultipleUnits: false
  };
};

/**
 * Formats the unit price display
 */
export const formatUnitPrice = (unitPrice: number): string => {
  return `Unit Price: R${unitPrice.toFixed(2)}`;
};