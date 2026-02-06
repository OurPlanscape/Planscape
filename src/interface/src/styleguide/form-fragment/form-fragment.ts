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
 * Base class for reusable form fragments (CVA).
 *
 * Absorbs all the ControlValueAccessor and Validator boilerplate.
 * Child only defines `control` with its validators.
 *
 * @example
 * ```typescript
 * @Component({
 *   providers: [formFragmentProviders(StandSizeSelectorComponent)],
 * })
 * export class StandSizeSelectorComponent extends FormFragment<string> {
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
    // Get the NgControl after injection is complete
    this.ngControl = this.injector.get(NgControl, null);

    // Subscribe to status changes to notify parent when validation state changes
    this.control.statusChanges.subscribe(() => {
      this.onValidatorChange();
    });
  }

  ngDoCheck(): void {
    // Check if parent control was marked as touched and propagate to internal control
    if (this.ngControl?.touched && !this.wasTouched) {
      this.wasTouched = true;
      this.control.markAllAsTouched();
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // ControlValueAccessor
  // ──────────────────────────────────────────────────────────────────

  writeValue(value: T): void {
    if (this.control instanceof FormControl) {
      this.control.setValue(value, { emitEvent: false });
    } else {
      this.control.patchValue(value as any, { emitEvent: false });
    }
  }

  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
    // Subscribe once
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

  /** Call this from the template when the user interacts */
  markAsTouched(): void {
    this.onTouched();
    this.control.markAsTouched();
  }

  // ──────────────────────────────────────────────────────────────────
  // Validator
  // ──────────────────────────────────────────────────────────────────

  validate(_control: AbstractControl): ValidationErrors | null {
    const result = this.control.valid ? null : (this.control.errors || { invalid: true });
    console.log('[FormFragment] validate called', {
      internalValid: this.control.valid,
      internalErrors: this.control.errors,
      returning: result
    });
    return result;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
