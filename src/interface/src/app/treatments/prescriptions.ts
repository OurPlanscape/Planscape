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
  name: string;
  details: string[];
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
  HEAVY_THINNING_BURN: '#FFBE0B',
  MODERATE_MASTICATION: '#2A9D8F',
  HEAVY_MASTICATION: '#90BE6D',
  RX_FIRE: '#EF233C',
  HEAVY_THINNING_RX_FIRE: '#780000',
  MASTICATION_RX_FIRE: '#FB6F92',
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: '#F77F00',
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: '#F77F00',
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: '#FFBE0B',
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: '#ef233c',
  RX_FIRE_PLUS_RX_FIRE: '#299d8f',
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: '#ef233c',
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: '#299d8f',
  MODERATE_MASTICATION_PLUS_RX_FIRE: '#177',
};

export const SEQUENCE_PATTERNS: Record<PrescriptionSequenceAction, string> = {
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: 'sequence1',
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: 'sequence2',
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: 'sequence3',
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: 'sequence4',
  RX_FIRE_PLUS_RX_FIRE: 'sequence5',
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: 'sequence6',
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: 'sequence7',
  MODERATE_MASTICATION_PLUS_RX_FIRE: 'sequence8',
};

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
  SequenceAttributes
> = {
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: {
    name: 'Sequence 1',
    details: [
      'Moderate Thinning & Pile Burn (year 0)',
      'Prescribed Burn (year 10)',
    ],
  },
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: {
    name: 'Sequence 2',
    details: [
      'Moderate Thinning & Pile Burn (year 0)',
      'Moderate Thinning & Pile Burn (year 10)',
    ],
  },
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: {
    name: 'Sequence 3',
    details: [
      'Heavy Thinning & Pile Burn (year 0)',
      'Prescribed Burn (year 10)',
    ],
  },
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: {
    name: 'Sequence 4',
    details: [
      'Heavy Thinning & Pile Burn (year 0)',
      'Heavy Thinning & Pile Burn (year 10)',
    ],
  },
  RX_FIRE_PLUS_RX_FIRE: {
    name: 'Sequence 5',
    details: ['Prescribed Fire (year 0)', 'Prescribed Fire (year 10)'],
  },
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: {
    name: 'Sequence 6',
    details: [
      'Moderate Mastication (year 0)',
      'Moderate Mastication (year 10)',
    ],
  },
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: {
    name: 'Sequence 7',
    details: [
      'Heavy Thinning & Biomass Removal (year 0)',
      'Prescribed Fire (year 10)',
    ],
  },
  MODERATE_MASTICATION_PLUS_RX_FIRE: {
    name: 'Sequence 8',
    details: ['Moderate Mastication (year 0)', 'Prescribed Fire (year 10)'],
  },
};

// User facing names for all prescriptions
export const PRESCRIPTIONS = {
  SINGLE: SINGLE_ACTIONS,
  SEQUENCE: SEQUENCE_ACTIONS,
};
