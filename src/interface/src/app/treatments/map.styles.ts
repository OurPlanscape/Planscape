// colors

import { TreatedStand } from '@types';
import {
  PRESCRIPTION_COLORS,
  PrescriptionSequenceAction,
  PrescriptionSingleAction,
  SEQUENCE_PATTERNS,
} from './prescriptions';

export const BASE_COLORS: Record<
  'white' | 'black' | 'blue' | 'dark' | 'light' | 'yellow',
  string
> = {
  white: '#FFF',
  black: '#000',
  dark: '#4A4A4A',
  light: '#F6F6F650',
  blue: '#007dff',
  yellow: '#FFD54F',
};

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
  'fill-opacity': 0.7,
};

export const PROJECT_AREA_OUTLINE_PAINT = {
  'line-color': BASE_COLORS.dark,
  'line-width': 4,
};

export const STANDS_CELL_PAINT = {
  'line-color': BASE_COLORS.dark,
  'line-width': 1,
};

export const BASE_STANDS_PAINT = {
  'fill-color': BASE_COLORS.light,
  'fill-opacity': 0.5,
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
