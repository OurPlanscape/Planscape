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

export const PROJECT_AREA_COLORS = [
  // Blue
  '#D1E0EF',
  '#ADCCE6',
  '#88B9DB',
  '#62A5CD',
  '#3D92C0',
  '#327CAC',
  '#2C678E',
  '#285577',
  '#234560',
  '#1F3449',
  // Red
  '#FDE2E2',
  '#F9C7C7',
  '#F5ADAD',
  '#F19393',
  '#ED7878',
  '#E95E5E',
  '#E54444',
  '#C73232',
  '#A02020',
  '#7B1414',
  // Green
  '#E6F4E6',
  '#CDEBCF',
  '#B4E1B8',
  '#9BD8A1',
  '#82CF8A',
  '#6AC674',
  '#52BD5D',
  '#3AB346',
  '#249A32',
  '#0E801E',
  // Orange
  '#FFF1E6',
  '#FFE0C4',
  '#FFD0A3',
  '#FFBF82',
  '#FFAF61',
  '#FF9F40',
  '#FF8F1F',
  '#E07812',
  '#BF640F',
  '#8C480B',
  // Purple
  '#F0E6F9',
  '#E3CFEF',
  '#D6B8E5',
  '#C8A0DB',
  '#BB89D1',
  '#AE71C7',
  '#9147B3',
  '#78349C',
  '#5F2185',
  '#46106E',
];

export const DEFAULT_AREA_COLOR = '#4965c7';

export const EXCLUDED_AREAS = [
  { label: 'National Forests', key: 'NATIONAL_FORESTS' },
  { label: 'National Parks', key: 'NATIONAL_PARKS' },
  { label: 'Private Land', key: 'PRIVATE_LANDS' },
  { label: 'State Parks', key: 'STATE_PARKS' },
  { label: 'Tribal Lands', key: 'TRIBAL_LANDS' },
  { label: 'Wilderness Area', key: 'WILDERNESS_AREA' },
];

/**
 * @desc This RegEx matches the built-in email validation regex used by Django's
 * built-in validation.
 *
 * Keeping these in sync reduces the possibility that an email format
 * that's accepted by Angular is rejected by the backend.
 */
export const EMAIL_VALIDATION_REGEX = /^[\w+\.-]+@[\w+\.-]+\.[a-zA-Z]{2,}$/;
