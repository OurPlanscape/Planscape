const MIN_AREA_PERCENTAGE = 0.2;
const MAX_AREA_PERCENTAGE = 0.8;

export function calculateMinArea(planningArea: number) {
  return planningArea * MIN_AREA_PERCENTAGE;
}

export function calculateMaxArea(planningArea: number) {
  return planningArea * MAX_AREA_PERCENTAGE;
}

export function hasEnoughBudget(
  planningAreaAcres: number,
  estCostPerAcre: number,
  maxCost: number
) {
  const totalBudgetedAcres = maxCost / estCostPerAcre;
  return totalBudgetedAcres >= planningAreaAcres * MIN_AREA_PERCENTAGE;
}

export function calculateMinBudget(
  planningAreaAcres: number,
  estCostPerAcre: number
) {
  return planningAreaAcres * estCostPerAcre * MIN_AREA_PERCENTAGE;
}
