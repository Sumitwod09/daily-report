export function calculateFine(
  weightGrams: number,
  purityPercent: number,
  wastagePercent: number = 0
): number {
  const fine = weightGrams * (purityPercent - wastagePercent) / 100;
  return parseFloat(fine.toFixed(3));
}

export function calculateGoldValue(
  weightGrams: number,
  pricePerGram: number
): number {
  return parseFloat((weightGrams * pricePerGram).toFixed(2));
}

export const GOLD_PURITIES = [
  { label: '24K (99.9%)', value: 99.9 },
  { label: '22K (91.6%)', value: 91.6 },
  { label: '20K (83.3%)', value: 83.3 },
  { label: '18K (75.0%)', value: 75.0 },
  { label: '14K (58.5%)', value: 58.5 },
];
