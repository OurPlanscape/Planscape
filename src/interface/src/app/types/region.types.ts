export enum Region {
  SIERRA_NEVADA = 'Sierra Nevada',
  SOUTHERN_CALIFORNIA = 'Southern California',
  CENTRAL_COAST = 'Central Coast',
  NORTHERN_CALIFORNIA = 'Northern California',
}

export const regions: Region[] = [
  Region.SIERRA_NEVADA,
  Region.SOUTHERN_CALIFORNIA,
  Region.CENTRAL_COAST,
  Region.NORTHERN_CALIFORNIA,
];

/* Note: these are the names used by the configurations and backend
 * Defaults to Sierra Nevada. */
export function regionToString(region: Region | null): string {
  switch (region) {
    case Region.SIERRA_NEVADA:
      return 'sierra-nevada';
    case Region.CENTRAL_COAST:
      return 'central-coast';
    case Region.NORTHERN_CALIFORNIA:
      return 'northern-california';
    case Region.SOUTHERN_CALIFORNIA:
      return 'southern-california';
  }
  return 'sierra-nevada';
}

export const RegionsWithString = [
  {
    name: Region.SIERRA_NEVADA,
    value: regionToString(Region.SIERRA_NEVADA),
  },
  {
    name: Region.CENTRAL_COAST,
    value: regionToString(Region.CENTRAL_COAST),
  },
  {
    name: Region.NORTHERN_CALIFORNIA,
    value: regionToString(Region.NORTHERN_CALIFORNIA),
  },
  {
    name: Region.SOUTHERN_CALIFORNIA,
    value: regionToString(Region.SOUTHERN_CALIFORNIA),
  },
];
