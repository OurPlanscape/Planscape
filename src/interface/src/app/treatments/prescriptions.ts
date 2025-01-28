import { Prescription, TreatmentSummary } from '@types';

// Single prescription keys
export type PrescriptionSingleAction =
  | 'MODERATE_THINNING_BIOMASS'
  | 'HEAVY_THINNING_BIOMASS'
  | 'MODERATE_THINNING_BURN'
  | 'HEAVY_THINNING_BURN'
  | 'MODERATE_MASTICATION'
  | 'HEAVY_MASTICATION'
  | 'RX_FIRE'
  | 'HEAVY_THINNING_RX_FIRE'
  | 'MASTICATION_RX_FIRE';

// Sequenced prescription keys
export type PrescriptionSequenceAction =
  | 'MODERATE_THINNING_BURN_PLUS_RX_FIRE'
  | 'MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN'
  | 'HEAVY_THINNING_BURN_PLUS_RX_FIRE'
  | 'HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN'
  | 'RX_FIRE_PLUS_RX_FIRE'
  | 'MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION'
  | 'HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE'
  | 'MODERATE_MASTICATION_PLUS_RX_FIRE';

export interface SequenceAttributes {
  description: string;
  year: number;
}

// All possible prescription keys
export type PrescriptionAction =
  | PrescriptionSingleAction
  | PrescriptionSequenceAction;

// Color assigment for all prescriptions
export const PRESCRIPTION_COLORS: Record<PrescriptionAction, string> = {
  MODERATE_THINNING_BIOMASS: '#3A86FF',
  HEAVY_THINNING_BIOMASS: '#8338EC',
  MODERATE_THINNING_BURN: '#F77F00',
  HEAVY_THINNING_BURN: '#F4A261',
  MODERATE_MASTICATION: '#2A9D8F',
  HEAVY_MASTICATION: '#90BE6D',
  RX_FIRE: '#EF233C',
  HEAVY_THINNING_RX_FIRE: '#780000',
  MASTICATION_RX_FIRE: '#FB6F92',
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: '#F77F00',
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: '#F77F00',
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: '#FFBE0B',
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: '#FFBE0B',
  RX_FIRE_PLUS_RX_FIRE: '#ee243b',
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: '#299d8f',
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: '#ef233c',
  MODERATE_MASTICATION_PLUS_RX_FIRE: '#299d8f',
};

export type PatternName = 'stripes-red' | 'stripes-black' | 'stripes-purple';

export const SEQUENCE_PATTERNS: Record<
  PrescriptionSequenceAction,
  PatternName
> = {
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: 'stripes-red',
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: 'stripes-black',
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: 'stripes-red',
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: 'stripes-black',
  RX_FIRE_PLUS_RX_FIRE: 'stripes-black',
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: 'stripes-black',
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: 'stripes-purple',
  MODERATE_MASTICATION_PLUS_RX_FIRE: 'stripes-red',
};

export const PATTERN_NAMES = [
  ...new Set(Object.values(SEQUENCE_PATTERNS)),
] as PatternName[];

// User facing names for single actions
const SINGLE_ACTIONS: Record<PrescriptionSingleAction, string> = {
  MODERATE_THINNING_BIOMASS: 'Moderate Thinning & Biomass Removal',
  HEAVY_THINNING_BIOMASS: 'Heavy Thinning & Biomass Removal',
  MODERATE_THINNING_BURN: 'Moderate Thinning & Pile Burn',
  HEAVY_THINNING_BURN: 'Heavy Thinning & Pile Burn',
  MODERATE_MASTICATION: 'Moderate Mastication',
  HEAVY_MASTICATION: 'Heavy Mastication',
  RX_FIRE: 'Prescribed Fire',
  HEAVY_THINNING_RX_FIRE: 'Heavy Thinning & Prescribed Fire',
  MASTICATION_RX_FIRE: 'Mastication & Prescribed Fire',
};
// User facing names for sequence actions
export const SEQUENCE_ACTIONS: Record<
  PrescriptionSequenceAction,
  SequenceAttributes[]
> = {
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: [
    { description: 'Moderate Thin & Pile Burn', year: 0 },
    { description: 'Prescribed Burn', year: 10 },
  ],
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: [
    { description: 'Moderate Thin & Pile Burn', year: 0 },
    { description: 'Moderate Thin & Pile Burn', year: 10 },
  ],
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: [
    { description: 'Heavy Thin & Pile Burn', year: 0 },
    { description: 'Prescribed Burn', year: 10 },
  ],

  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: [
    { description: 'Heavy Thin & Pile Burn', year: 0 },
    { description: 'Heavy Thin & Pile Burn', year: 10 },
  ],

  RX_FIRE_PLUS_RX_FIRE: [
    { description: 'Prescribed Fire', year: 0 },
    { description: 'Prescribed Fire', year: 10 },
  ],
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: [
    { description: 'Moderate Mastication', year: 0 },
    { description: 'Moderate Mastication', year: 10 },
  ],
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: [
    { description: 'Heavy Thin & Biomass Removal', year: 0 },
    { description: 'Prescribed Fire', year: 10 },
  ],
  MODERATE_MASTICATION_PLUS_RX_FIRE: [
    { description: 'Moderate Mastication', year: 0 },
    { description: 'Prescribed Fire', year: 10 },
  ],
};

// User facing names for all prescriptions
export const PRESCRIPTIONS = {
  SINGLE: SINGLE_ACTIONS,
  SEQUENCE: SEQUENCE_ACTIONS,
};

export function descriptionsForAction(action: string): string[] {
  let treatments: string[] = [];
  if (PRESCRIPTIONS.SINGLE[action as PrescriptionSingleAction]) {
    treatments.push(PRESCRIPTIONS.SINGLE[action as PrescriptionSingleAction]);
  } else if (PRESCRIPTIONS.SEQUENCE[action as PrescriptionSequenceAction]) {
    treatments = PRESCRIPTIONS.SEQUENCE[
      action as PrescriptionSequenceAction
    ].map((d) => `${d.description} (Year ${d.year})`);
  }
  return treatments;
}

export function getPrescriptionsFromSummary(
  summary: TreatmentSummary
): Prescription[] {
  return summary.project_areas
    .flatMap((project_area) => project_area.prescriptions)
    .reduce((unique: Prescription[], prescription) => {
      if (!unique.find((p) => p.action === prescription.action)) {
        unique.push(prescription);
      }
      return unique;
    }, []);
}

export function getTreatmentTypeOptions(
  summary: TreatmentSummary | null
): PrescriptionAction[] {
  if (!summary?.project_areas) {
    return [];
  }
  const prescriptions: Prescription[] = getPrescriptionsFromSummary(summary);
  return prescriptions.map((p) => p.action);
}
