import { MatLegacySnackBarConfig as MatSnackBarConfig } from '@angular/material/legacy-snack-bar';

/**
 * @desc Error message indicating some unknown error occurred while attempting a
 * password reset
 */
export const MSG_RESET_PASSWORD_ERROR =
  'Unable to reset your password at this time. Please try again later.';

export const SNACK_NOTICE_CONFIG: MatSnackBarConfig<any> = {
  duration: 4000,
  panelClass: ['snackbar-notice'],
  verticalPosition: 'top',
};

export const SNACK_BOTTOM_NOTICE_CONFIG: MatSnackBarConfig<any> = {
  duration: 4000,
  panelClass: ['snackbar-notice'],
  verticalPosition: 'bottom',
};

export const SNACK_ERROR_CONFIG: MatSnackBarConfig<any> = {
  duration: 10000,
  panelClass: ['snackbar-error'],
  verticalPosition: 'top',
};

export const SNACK_DEBUG_CONFIG: MatSnackBarConfig<any> = {
  duration: 30000,
  panelClass: ['snackbar-debug-error'],
  verticalPosition: 'top',
};

const blue = [
  '#1F3449',
  '#234560',
  '#285577',
  '#2C678E',
  '#327CAC',
  '#3D92C0',
  '#62A5CD',
  '#88B9DB',
  '#ADCCE6',
  '#D1E0EF',
];

const red = [
  '#7B1414',
  '#A02020',
  '#C73232',
  '#E54444',
  '#E95E5E',
  '#ED7878',
  '#F19393',
  '#F5ADAD',
  '#F9C7C7',
  '#FDE2E2',
];

const green = [
  '#0E801E',
  '#249A32',
  '#3AB346',
  '#52BD5D',
  '#6AC674',
  '#82CF8A',
  '#9BD8A1',
  '#B4E1B8',
  '#CDEBCF',
  '#E6F4E6',
];

const orange = [
  '#8C480B',
  '#BF640F',
  '#E07812',
  '#FF8F1F',
  '#FF9F40',
  '#FFAF61',
  '#FFBF82',
  '#FFD0A3',
  '#FFE0C4',
  '#FFF1E6',
];

const purple = [
  '#46106E',
  '#5F2185',
  '#78349C',
  '#9147B3',
  '#AE71C7',
  '#BB89D1',
  '#C8A0DB',
  '#D6B8E5',
  '#E3CFEF',
  '#F0E6F9',
];

export const PROJECT_AREA_COLORS = [
  ...blue,
  ...red,
  ...green,
  ...orange,
  ...purple,
];

export const DEFAULT_AREA_COLOR = '#4965c7';

export const BASE_LAYERS_DEFAULT = {
  COLOR: '#789',
  OPACITY: 0,
};

/**
 * @desc This RegEx matches the built-in email validation regex used by Django's
 * built-in validation.
 *
 * Keeping these in sync reduces the possibility that an email format
 * that's accepted by Angular is rejected by the backend.
 */
export const EMAIL_VALIDATION_REGEX = /^[\w+\.-]+@[\w+\.-]+\.[a-zA-Z]{2,}$/;

interface ChartColorMap {
  [key: string]: string; // This allows any string key to map to a string value (the color code)
}
//TODO: revise these with finished list?
export const ChartColors: ChartColorMap = {
  'Probability of Fire Severity - High': '#483D78',
  'Probability of Fire Severity - Low': '#ffaaaa',
  'Total Aboveground Carbon': '#BBE3B6',
  'Damage Potential': '#85B167',
  'Structure Exposure Score': '#FFDB69',
  'SNV Standing Dead and Ladder Fuels': '#F18226',
  'Forest Canopy Cover': '#A59CCD',
};
