// Helper to distinguish between object vs scalar
import { FormControl, FormGroup } from '@angular/forms';

type IsPlainObject<T> = T extends object
  ? T extends Function
    ? false
    : T extends Array<any>
      ? false
      : true
  : false;

export type ControlsOf<T> = {
  [K in keyof T]: IsPlainObject<NonNullable<T[K]>> extends true
    ? FormGroup<ControlsOf<NonNullable<T[K]>>>
    : FormControl<T[K] | null>;
};
