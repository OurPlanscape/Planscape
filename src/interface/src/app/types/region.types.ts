export enum Region {
  SIERRA_NEVADA = 'Sierra Nevada',
  SOUTHERN_CALIFORNIA = 'Southern California',
  CENTRAL_COAST = "Central Coast",
  NORTHERN_CALIFORNIA = "Northern California",
}

export interface RegionOption {
  type: Region;
  name: string;
  available: boolean;
}

const regions: Region[] = [
  Region.SIERRA_NEVADA,
  Region.SOUTHERN_CALIFORNIA,
  Region.CENTRAL_COAST,
  Region.NORTHERN_CALIFORNIA,
]

const availableRegions = new Set([
  Region.SIERRA_NEVADA,
])

export const regionOptions = regions.map((region) => {
  return {
    type: region,
    name: region,
    available: availableRegions.has(region),
  }
});
