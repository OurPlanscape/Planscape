import { InjectionToken } from '@angular/core';

// Determines if favorites star should be displayed or not
// For example: On scenarios creation we cannot favorite/unfavorite but we should be able to see favorites section
export const SHOW_FAVORITE_STAR = new InjectionToken<boolean>(
  'SHOW_FAVORITE_STAR',
  {
    providedIn: 'root',
    factory: () => true,
  }
);
