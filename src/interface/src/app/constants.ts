import { MatSnackBarConfig } from '@angular/material/snack-bar';

export const ERROR_SNACK_CONFIG: MatSnackBarConfig<any> = {
  duration: 10000,
  panelClass: ['snackbar-error'],
  verticalPosition: 'top',
};
