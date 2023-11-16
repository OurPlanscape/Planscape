import { MatSnackBarConfig } from '@angular/material/snack-bar';

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

export const SNACK_ERROR_CONFIG: MatSnackBarConfig<any> = {
  duration: 10000,
  panelClass: ['snackbar-error'],
  verticalPosition: 'top',
};

export const PROJECT_AREA_COLORS = [
  '#FAD648',
  '#FF9E58',
  '#BCC3FF',
  '#27C5F5',
  '#FFC2C2',
  '#FEDEBE',
  '#B9D4FF',
  '#FDE3FF',
  '#7BC7B9',
  '#7F95FF',
];

export const DEFAULT_AREA_COLOR = '#4965c7';

export const EXCLUDED_AREA_OPTIONS = [
  'National Forests',
  'National Parks',
  'Private Land',
  'State Parks',
  'Tribal Lands',
  'Wilderness Area',
];
