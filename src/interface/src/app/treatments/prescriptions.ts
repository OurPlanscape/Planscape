// placeholder for adding colors based on prescription actions

export type PrescriptionSingleAction =
  | 'NO_TREATMENT'
  | 'MODERATE_THINNING_BIOMASS'
  | 'HEAVY_THINNING_BIOMASS'
  | 'MODERATE_THINNING_BURN'
  | 'HEAVY_THINNING_BURN'
  | 'MODERATE_MASTICATION'
  | 'HEAVY_MASTICATION'
  | 'RX_FIRE'
  | 'HEAVY_THINNING_RX_FIRE'
  | 'MASTICATION_RX_FIRE';

export type PrescriptionSequenceAction =
  | 'MODERATE_THINNING_BURN_PLUS_RX_FIRE'
  | 'MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN'
  | 'HEAVY_THINNING_BURN_PLUS_RX_FIRE'
  | 'HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN'
  | 'RX_FIRE_PLUS_RX_FIRE'
  | 'MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION'
  | 'HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE'
  | 'MODERATE_MASTICATION_PLUS_RX_FIRE';

export type PrescriptionAction =
  | PrescriptionSingleAction
  | PrescriptionSequenceAction;

export const SEQUENCE_COLORS: Record<PrescriptionSingleAction, string> = {
  NO_TREATMENT: '#000000',
  MODERATE_THINNING_BIOMASS: '#3A86FF',
  HEAVY_THINNING_BIOMASS: '#8338EC',
  MODERATE_THINNING_BURN: '#F77F00',
  HEAVY_THINNING_BURN: '#FFBE0B',
  MODERATE_MASTICATION: '#2A9D8F',
  HEAVY_MASTICATION: '#90BE6D',
  RX_FIRE: '#EF233C',
  HEAVY_THINNING_RX_FIRE: '#780000',
  MASTICATION_RX_FIRE: '#FB6F92',
};

//TODO: Remove this mapping if we can just get this from the lookup endpoint
export const USER_FACING_RX_STRING: Record<PrescriptionSingleAction, string> = {
  NO_TREATMENT: 'No Treatment',
  MODERATE_THINNING_BIOMASS: 'Moderate thin & Biomass removal',
  HEAVY_THINNING_BIOMASS: 'Heavy thin & Biomass removal',
  MODERATE_THINNING_BURN: 'Moderate thin & Pile burn',
  HEAVY_THINNING_BURN: 'Heavy thin & Pile burn',
  MODERATE_MASTICATION: 'Moderate mastication',
  HEAVY_MASTICATION: 'Heavy mastication',
  RX_FIRE: 'Prescribed fire',
  HEAVY_THINNING_RX_FIRE: 'Heavy thin & RX fire',
  MASTICATION_RX_FIRE: 'Mastication & RX fire',
};
