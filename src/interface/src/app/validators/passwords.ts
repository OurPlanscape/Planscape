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
    const passwordField = formControls.get(passwordFieldName);
    const confirmationField = formControls.get(passwordConfirmFieldName);

    const passwordErrors = passwordField?.errors || {};
    const confirmationErrors = confirmationField?.errors || {};

    // remove previous error if any
    delete passwordErrors['newPasswordsMustMatch'];
    delete confirmationErrors['newPasswordsMustMatch'];

    const passwordsMustMatch: Pick<
      PasswordFieldsErrors,
      'newPasswordsMustMatch'
    > = {
      newPasswordsMustMatch: true,
    };

    const password = passwordField?.value;
    const confirmation = confirmationField?.value;

    if (password.length > 0 && confirmation.length > 0) {
      if (password !== confirmation) {
        // add errors to fields
        passwordField?.setErrors({ ...passwordErrors, ...passwordsMustMatch });
        confirmationField?.setErrors({
          ...confirmationErrors,
          ...passwordsMustMatch,
        });
        return passwordsMustMatch;
      }
    }

    passwordField?.setErrors(formatErrors(passwordErrors));
    confirmationField?.setErrors(formatErrors(confirmationErrors));
    return null;
  };
  return crossFieldValidators;
}

function formatErrors(field: ValidationErrors) {
  return Object.keys(field).length > 0 ? field : null;
}
