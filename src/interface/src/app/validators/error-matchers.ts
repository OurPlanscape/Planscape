import { ErrorStateMatcher } from '@angular/material/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { PasswordFieldsErrors } from './passwords';

export class PasswordStateMatcher implements ErrorStateMatcher {
  constructor(private errors: (keyof PasswordFieldsErrors)[]) {}

  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    const hasError = this.errors.some((error) => form?.hasError(error));
    return (
      hasError ||
      !!(control && control.invalid && (control.touched || isSubmitted))
    );
  }
}
