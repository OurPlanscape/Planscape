import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// the possible custom errors
interface PasswordFieldsErrors {
  newPasswordMustBeNew: boolean;
  newPasswordsMustMatch: boolean;
}

/**
 * Validates that the current password is not the same as the new one
 * @param currentPasswordFieldName the name of the current password formControl element on the form
 * @param passwordFieldName the name of the new password formControl element on the form
 * @return if error returns `newPasswordMustBeNew: true`
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
    const error: Pick<PasswordFieldsErrors, 'newPasswordMustBeNew'> = {
      newPasswordMustBeNew: true,
    };
    if (
      currentPassword.length > 0 &&
      password.length > 0 &&
      currentPassword === password
    ) {
      return error;
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
    const password1 = formControls.get(passwordFieldName)?.value;
    const password2 = formControls.get(passwordConfirmFieldName)?.value;

    const passwordsMustMatch: Pick<
      PasswordFieldsErrors,
      'newPasswordsMustMatch'
    > = {
      newPasswordsMustMatch: true,
    };

    if (password1.length > 0 && password2.length > 0) {
      if (password1 !== password2) {
        formControls.get(passwordConfirmFieldName)?.setErrors({
          passwordsMustMatchValidator: 'Passwords must match.',
        });
        return passwordsMustMatch;
      }
    }
    return null;
  };
  return crossFieldValidators;
}
