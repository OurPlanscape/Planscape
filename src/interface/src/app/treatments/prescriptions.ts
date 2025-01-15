import { Prescription } from '@types';

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

interface SequenceDescription {
  action: string;
  timeStep: string;
}

// User facing names for sequence actions
export const SEQUENCE_ACTIONS: Record<
  PrescriptionSequenceAction,
  SequenceDescription[]
> = {
  MODERATE_THINNING_BURN_PLUS_RX_FIRE: [
    { action: 'Moderate Thinning & Pile Burn', timeStep: '(Year 0)' },
    { action: 'Prescribed Burn', timeStep: '(Year 10)' },
  ],
  MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: [
    { action: 'Moderate Thinning & Pile Burn', timeStep: '(Year 0)' },
    { action: 'Moderate Thinning & Pile Burn', timeStep: '(Year 10)' },
  ],
  HEAVY_THINNING_BURN_PLUS_RX_FIRE: [
    { action: 'Heavy Thinning & Pile Burn', timeStep: '(Year 0)' },
    { action: 'Prescribed Burn', timeStep: '(Year 10)' },
  ],
  HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: [
    { action: 'Heavy Thinning & Pile Burn', timeStep: '(Year 0)' },
    { action: 'Heavy Thinning & Pile Burn', timeStep: '(Year 10)' },
  ],
  RX_FIRE_PLUS_RX_FIRE: [
    { action: 'Prescribed Fire', timeStep: '(Year 0)' },
    { action: 'Prescribed Fire', timeStep: '(Year 10)' },
  ],
  MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: [
    { action: 'Moderate Mastication', timeStep: '(Year 0)' },
    { action: 'Moderate Mastication', timeStep: '(Year 10)' },
  ],
  HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: [
    { action: 'Heavy Thinning & Biomass Removal', timeStep: '(Year 0)' },
    { action: 'Prescribed Fire', timeStep: '(Year 10)' },
  ],
  MODERATE_MASTICATION_PLUS_RX_FIRE: [
    { action: 'Moderate Mastication', timeStep: '(Year 0)' },
    { action: 'Prescribed Fire', timeStep: '(Year 10)' },
  ],
};

// User facing names for all prescriptions
export const PRESCRIPTIONS = {
  SINGLE: SINGLE_ACTIONS,
  SEQUENCE: SEQUENCE_ACTIONS,
};

// Tabulate the total treated stands count from a prescriptions array
export function getTreatedStandsTotal(prescriptions: Prescription[]) {
  return prescriptions.reduce((total: number, prescription) => {
    total = total + prescription.treated_stand_count;
    return total;
  }, 0);
}

export function nameForTypeAndAction(
  type: string,
  action: string
): string | null {
  if (type === 'SINGLE') {
    let title = action as PrescriptionSingleAction;
    if (title !== null) {
      return PRESCRIPTIONS.SINGLE[title];
    }
  } else if (type === 'SEQUENCE') {
    let title = action as PrescriptionSequenceAction;
    if (title !== null) {
      return 'FIX ME';
      // return PRESCRIPTIONS.SEQUENCE[title].name;
    }
  }
  return null;
}

export function nameForAction(action: string): string {
  return (
    PRESCRIPTIONS.SINGLE[action as PrescriptionSingleAction] || 'FIX ME'
    // PRESCRIPTIONS.SEQUENCE[action as PrescriptionSequenceAction].name ||
  );
}

export function descriptionForAction(action: string): string {
  return (
    PRESCRIPTIONS.SINGLE[action as PrescriptionSingleAction] || 'FIX ME'
    //PRESCRIPTIONS.SEQUENCE[action as PrescriptionSequenceAction].details.join(
  );
}
