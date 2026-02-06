import { Directive, DoCheck, inject, Injector, OnInit } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NgControl,
  ValidationErrors,
  Validator,
} from '@angular/forms';

/**
 * Base class for reusable form fragments (CVA + Validator).
 *
 * Handles all ControlValueAccessor and Validator boilerplate.
 * Child only defines `control` with its validators.
 *
 * @example
 * ```typescript
 * @Component({
 *   providers: formFragmentProviders(MyComponent),
 * })
 * export class MyComponent extends FormFragment<string> {
 *   control = new FormControl<string>('', Validators.required);
 * }
 * ```
 */
@Directive()
export abstract class FormFragment<T>
  implements ControlValueAccessor, Validator, OnInit, DoCheck
{
  /**
   * The internal control. Can be a FormControl or FormGroup.
   * Child must define it with its validators.
   */
  abstract control: FormControl<T> | FormGroup;

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};
  private subscribed = false;
  private wasTouched = false;

  private injector = inject(Injector);
  private ngControl: NgControl | null = null;

  ngOnInit(): void {
    this.ngControl = this.injector.get(NgControl, null);

    // Notify parent when validation state changes
    this.control.statusChanges.subscribe(() => {
      this.onValidatorChange();
    });
  }

  ngDoCheck(): void {
    // Propagate touched state from parent to internal control
    if (this.ngControl?.touched && !this.wasTouched) {
      this.wasTouched = true;
      this.control.markAllAsTouched();
    }
  }

  // ControlValueAccessor

  writeValue(value: T): void {
    if (this.control instanceof FormControl) {
      this.control.setValue(value, { emitEvent: false });
    } else {
      this.control.patchValue(value as any, { emitEvent: false });
    }
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
    if (!this.subscribed) {
      this.control.valueChanges.subscribe((val) => this.onChange(val as T));
      this.subscribed = true;
    }
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.control.disable() : this.control.enable();
  }

  markAsTouched(): void {
    this.onTouched();
    this.control.markAsTouched();
  }

  // Validator

  validate(_control: AbstractControl): ValidationErrors | null {
    return this.control.valid ? null : this.control.errors || { invalid: true };
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
