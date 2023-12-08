import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// the possible custom errors
export interface PasswordFieldsErrors {
  newPasswordMustBeNew: boolean;
  newPasswordsMustMatch: boolean;
}

/**
 * Validates that the current password is not the same as the new one
 * @param currentPasswordFieldName the name of the current password formControl element on the form
 * @param passwordFieldName the name of the new password formControl element on the form
 * @return if error returns `newPasswordMustBeNew: true`. Will additionally mark with the error the field with passwordFieldName
 */
export function passwordMustBeNewValidator(
  currentPasswordFieldName: string,
  passwordFieldName: string
) {
  const newPasswordValidation: ValidatorFn = (
    formControls: AbstractControl
  ): ValidationErrors | null => {
    const currentPassword = formControls.get(currentPasswordFieldName)?.value;
    const password = formControls.get(passwordFieldName)?.value;

    // error
    const passwordMustBeNewError: Partial<PasswordFieldsErrors> = {
      newPasswordMustBeNew: true,
    };

    if (
      currentPassword.length > 0 &&
      password.length > 0 &&
      currentPassword === password
    ) {
      return passwordMustBeNewError;
    }

    return null;
  };
  return newPasswordValidation;
}

/**
 * Validates the format of the password and that it matches the password confirmation
 * @param passwordFieldName the name of the new password formControl element on the form
 * @param passwordConfirmFieldName the name of the new password confirmation formControl element on the form
 * @return if error returns `newPasswordsMustMatch: true`
 */
export function passwordsMustMatchValidator(
  passwordFieldName: string,
  passwordConfirmFieldName: string
): ValidatorFn {
  const crossFieldValidators: ValidatorFn = (
    formControls: AbstractControl
  ): ValidationErrors | null => {
    const errorKey = 'newPasswordsMustMatch';
    const passwordsMustMatchError: Pick<PasswordFieldsErrors, typeof errorKey> =
      { newPasswordsMustMatch: true };

    const password = formControls.get(passwordFieldName)?.value;
    const confirmation = formControls.get(passwordConfirmFieldName)?.value;

    if (
      password.length > 0 &&
      confirmation.length > 0 &&
      password !== confirmation
    ) {
      return passwordsMustMatchError;
    }
    return null;
  };
  return crossFieldValidators;
}
