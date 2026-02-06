import { forwardRef, Provider, Type } from '@angular/core';
import { NG_VALIDATORS, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Helper to generate the CVA + Validator providers.
 *
 * @example
 * ```typescript
 * @Component({
 *   providers: formFragmentProviders(MyComponent),
 * })
 * export class MyComponent extends FormFragment<string> { ... }
 * ```
 */
export function formFragmentProviders(component: Type<any>): Provider[] {
  return [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => component),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => component),
      multi: true,
    },
  ];
}
