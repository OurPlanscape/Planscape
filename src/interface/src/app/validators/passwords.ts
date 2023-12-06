import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// the possible custom errors
interface PasswordFieldsErrors {
  newPasswordMustBeNew: boolean;
  newPasswordsMustMatch: boolean;
  mustContainNumber: boolean;
  mustContainUpper: boolean;
  mustContainLower: boolean;
}

/**
 * Validates that the current password is not the same as the new one
 * @param currentPasswordFieldName the name of the current password formControl element on the form
 * @param passwordFieldName the name of the new password formControl element on the form
 * @return if error returns `newPasswordMustBeNew: true`
 */
export function newPasswordMustBeNewValidator(
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
 * @return if found errors returns `Omit<PasswordErrors, 'newPasswordMustBeNew'>`
 */
export function newPasswordValidator(
  passwordFieldName: string,
  passwordConfirmFieldName: string
): ValidatorFn {
  const crossFieldValidators: ValidatorFn = (
    formControls: AbstractControl
  ): ValidationErrors | null => {
    const password1 = formControls.get(passwordFieldName)?.value;
    const password2 = formControls.get(passwordConfirmFieldName)?.value;

    const allTheErrors: Omit<PasswordFieldsErrors, 'newPasswordMustBeNew'> = {
      newPasswordsMustMatch: false,
      mustContainNumber: false,
      mustContainUpper: false,
      mustContainLower: false,
    };

    if (password1.length > 0 && password2.length > 0) {
      if (password1 !== password2) {
        allTheErrors.newPasswordsMustMatch = true;
      }
      if (!/[0-9]+/.test(password1)) {
        allTheErrors.mustContainNumber = true;
      }
      if (!/[A-Z]+/.test(password1)) {
        allTheErrors.mustContainUpper = true;
      }
      if (!/[a-z]+/.test(password1)) {
        allTheErrors.mustContainLower = true;
      }
    }
    if (Object.entries(allTheErrors).some(([key, value]) => value !== false)) {
      return allTheErrors;
    }
    return null;
  };
  return crossFieldValidators;
}
