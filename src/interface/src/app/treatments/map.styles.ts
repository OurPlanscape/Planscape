// colors
import { TreatedStand } from '@types';
import {
  PRESCRIPTION_COLORS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
  SEQUENCE_PATTERNS,
} from './prescriptions';

export const BASE_COLORS = {
  white: '#FFF',
  black: '#000',
  dark: '#4A4A4A',
  md_gray: '#767575',
  light: '#F6F6F680',
  blue: '#007dff',
  yellow: '#FFD54F',
  almost_white: '#F6F6F6',
  white_light_blue: '#E9F1FF',
} as const;

export const SELECTED_STANDS_PAINT = {
  'fill-color': [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    BASE_COLORS.yellow,
    'transparent',
  ],
  'fill-outline-color': [
    'case',
    ['boolean', ['feature-state', 'selected'], false],
    BASE_COLORS.black,
    'transparent',
  ],
  'fill-opacity': 0.3,
};

export const SINGLE_STAND_SELECTED = {
  'fill-color': BASE_COLORS.yellow,
  'fill-opacity': 1,
};
export const SINGLE_STAND_HOVER = {
  'line-color': [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    BASE_COLORS.yellow,
    '#00000000',
  ],
  'line-width': 4,
} as any;

export const PROJECT_AREA_OUTLINE_PAINT = {
  'line-color': BASE_COLORS.dark,
  'line-width': 4,
};

export const STANDS_CELL_PAINT = {
  'line-color': BASE_COLORS.dark,
  'line-width': 0.5,
};

export const BASE_STANDS_PAINT = {
  'fill-color': 'red',
  'fill-opacity': 0.75,
};

export const LABEL_PAINT = {
  'text-color': BASE_COLORS.black,
  'text-halo-color': BASE_COLORS.white,
  'text-halo-width': 2,
};

export function generatePaintForTreatedStands(
  stands: TreatedStand[],
  opacity: number
) {
  return {
    'fill-color': generateColorsForTreatedStands(stands) as any,
    'fill-opacity': opacity,
  };
}

export function generatePaintForSequencedStands(
  sequenceStands: TreatedStand[],
  opacity: number
) {
  if (sequenceStands.length < 1) {
    return {};
  }

  return {
    'fill-pattern': generatePatternsForSequencedStands(sequenceStands) as any,
    'fill-opacity': opacity,
  };
}

function generatePatternsForSequencedStands(sequenceStands: TreatedStand[]) {
  const matchExpression: (number | string | string[])[] = [
    'match',
    ['get', 'id'],
  ];
  sequenceStands.forEach((stand) => {
    matchExpression.push(
      stand.id,
      SEQUENCE_PATTERNS[stand.action as PrescriptionSequenceAction]
    );
  });
  matchExpression.push('sequence1');

  return matchExpression;
}

function generateColorsForTreatedStands(stands: TreatedStand[]) {
  const defaultColor = BASE_COLORS.light;
  if (stands.length === 0) {
    return defaultColor;
  }
  const matchExpression: (number | string | string[])[] = [
    'match',
    ['get', 'id'],
  ];

  stands.forEach((stand) => {
    matchExpression.push(
      stand.id,
      PRESCRIPTION_COLORS[stand.action as PrescriptionSingleAction]
    );
  });
  matchExpression.push(defaultColor);

  return matchExpression;
}
