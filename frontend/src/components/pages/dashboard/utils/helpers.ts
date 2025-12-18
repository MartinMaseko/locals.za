import { format } from 'date-fns';

export const formatDate = (dateValue: any): string => {
  if (!dateValue) return 'N/A';

  try {
    if (typeof dateValue === 'object' && dateValue?.toDate) {
      return format(dateValue.toDate(), 'yyyy-MM-dd HH:mm');
    }

    if (typeof dateValue === 'object' && dateValue?.seconds) {
      return format(new Date(dateValue.seconds * 1000), 'yyyy-MM-dd HH:mm');
    }

    if (typeof dateValue === 'string') return format(new Date(dateValue), 'yyyy-MM-dd HH:mm');

    if (dateValue instanceof Date) return format(dateValue, 'yyyy-MM-dd HH:mm');

    return String(dateValue);
  } catch (error) {
    console.log('Date formatting error:', error, 'Value:', dateValue);
    return 'Invalid Date';
  }
};

export const generateProductId = () => {
  return 'PROD-' + Math.floor(1000000000 + Math.random() * 9000000000);
};

export const generateDriverId = () => {
  return 'DRIVER-' + Math.floor(1000000000 + Math.random() * 9000000000);
};

export const vehicleTypes = ['van', 'sedan', 'hatch'];

export const productCategories = [
  'Beverages',
  'Spices & Seasoning',
  'Canned Foods',
  'Sugar',
  'Flour',
  'Cooking Oils & Fats',
  'Rice',
  'Maize Meal',
  'Snacks & Confectionery',
  'Household Cleaning & Goods',
  'Laundry Supplies',
  'Personal Care',
  'Food Packaging',
  'Sauces',
  'Shampoos & Cleansers',
  'Conditioners & Treatments',
  'Relaxers & Perm Kits',
  'Hair Styling Products',
  'Hair Food & Oils',
  'Hair Coloring'
];
