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

export const WINDOW_LARGE_BREAKPOINT = 840;
export const WINDOW_SMALL_BREAKPOINT = 480;
