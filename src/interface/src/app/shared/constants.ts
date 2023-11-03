import { MatSnackBarConfig } from "@angular/material/snack-bar";

/**
 * @desc Error message indicating some unknown error occurred while attempting a
 * password reset
 */
export const MSG_RESET_PASSWORD_ERROR =
  'Unable to reset your password at this time. Please try again later.';

export const SNACKBAR_SUCCESS_CONFIG : MatSnackBarConfig<any> = {
  duration: 4000,
  panelClass: ['snackbar-success'],
  verticalPosition: 'top',
};
