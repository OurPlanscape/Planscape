/** An external "learn more" reference shown below a tooltip's copy. */
export interface FundingTooltipLink {
  /** Visible link text, e.g. "TreeMap 2022". */
  label: string;
  /** URL opened in a new tab. */
  url: string;
}

/** Content for a funding-report section tooltip. */
export interface FundingTooltip {
  /** Body copy (may contain inline HTML; rendered via innerHTML). */
  copy: string;
  /** Optional "Learn more" external references shown below the copy. */
  links?: FundingTooltipLink[];
}

/**
 * Tooltip content for the funding report sections, keyed by the name shown as
 * the modal title (matches the `tooltipName` set when a section tooltip opens).
 */
export const FUNDING_TOOLTIPS: Record<string, FundingTooltip> = {
  Carbon: {
    copy: `
       Carbon metrics are estimated using the Forest Vegetation Simulator (FVS) with spatially explicit forest conditions from the USFS TreeMap 2022 dataset (30 m resolution). The stands are grown to the 2025 modeling start year, and pre- and post-treatment scenarios are simulated in 5-year time steps to quantify the difference in standing aboveground live tree carbon and potential smoke emissions relative to a no-treatment baseline.
      `,
    links: [
      {
        label: 'TreeMap 2022',
        url: 'https://www.fs.usda.gov/rds/archive/catalog/RDS-2025-0032',
      },
      {
        label: 'FVS User Guide (2026)',
        url: 'https://www.fs.usda.gov/sites/default/files/forest-management/essential-fvs.pdf',
      },
    ],
  },
  Water: {
    copy: `Change in water availability is calculated as the difference between pre- and post-treatment maximum actual evapotranspiration (AETmax) across the planning area. Lower post-treatment AETmax indicates reduced vegetation water use and therefore greater water availability following treatment. The user specifies a percent change threshold. `,
    links: [
      {
        label: 'Natural Climate Solutions Data Atlas',
        url: 'https://cecs.ess.uci.edu/data-atlas/',
      },
    ],
  },
  Biomass: {
    copy: `Biomass is estimated using the Forest Vegetation Simulator (FVS) with with spatially explicit forest conditions from the USFS TreeMap 2022 dataset (30 m resolution). The stands are grown to the 2025 modeling start year to estimate available merchantable and non-merchantable biomass within the sum of all project areas, reported by hardwood and softwood forest types.`,
    links: [
      {
        label: 'TreeMap 2022',
        url: 'https://www.fs.usda.gov/rds/archive/catalog/RDS-2025-0032',
      },
      {
        label: 'FVS User Guide (2026)',
        url: 'https://www.fs.usda.gov/sites/default/files/forest-management/essential-fvs.pdf',
      },
    ],
  },
  'Flame Length': {
    copy: `Flame length is estimated using the Forest Vegetation Simulator (FVS) with spatially explicit forest conditions from the USFS TreeMap 2022 dataset (30 m resolution). The "total flame length" output from FVS is used to represent flame length under severe wildfire weather while accounting for possible crown fire activity. The stands are grown to the 2025 modeling start year, and pre- and post-treatment scenarios are simulated in 5-year time steps to quantify the difference in predicted fire intensity relative to a no-treatment baseline. Results show the percentage of the treatment area where modeled flame lengths are reduced according to user-specified thresholds relative to a no-treatment baseline.`,
    links: [
      {
        label: 'TreeMap 2022',
        url: 'https://www.fs.usda.gov/rds/archive/catalog/RDS-2025-0032',
      },
      {
        label: 'FVS User Guide (2026)',
        url: 'https://www.fs.usda.gov/sites/default/files/forest-management/essential-fvs.pdf',
      },
      {
        label: 'FFE-FVS Documentation',
        url: 'https://www.fs.usda.gov/sites/default/files/forest-management/fvs-ffe-guide.pdf',
      },
    ],
  },
};
