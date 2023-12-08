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
 * @return if error returns `newPasswordMustBeNew: true`. Will additionally mark with the error the field with passwordFieldName
 */
export function passwordMustBeNewValidator(
  currentPasswordFieldName: string,
  passwordFieldName: string
) {
  const newPasswordValidation: ValidatorFn = (
    formControls: AbstractControl
  ): ValidationErrors | null => {
    // current password
    const currentPasswordField = formControls.get(currentPasswordFieldName);
    const currentPassword = currentPasswordField?.value;
    // new password
    const passwordField = formControls.get(passwordFieldName);
    const password = passwordField?.value;

    // error
    let result: ValidationErrors | null = null;
    const errorKey = 'newPasswordMustBeNew';
    const passwordMustBeNewError: Pick<PasswordFieldsErrors, typeof errorKey> =
      { newPasswordMustBeNew: true };

    if (
      currentPassword.length > 0 &&
      password.length > 0 &&
      currentPassword === password
    ) {
      result = passwordMustBeNewError;
    }
    setErrorsOnField(passwordField, errorKey, result);

    return result;
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
    let result: ValidationErrors | null = null;

    const passwordField = formControls.get(passwordFieldName);
    const password = passwordField?.value;

    const confirmationField = formControls.get(passwordConfirmFieldName);
    const confirmation = confirmationField?.value;

    if (
      password.length > 0 &&
      confirmation.length > 0 &&
      password !== confirmation
    ) {
      result = passwordsMustMatchError;
    }
    setErrorsOnField(passwordField, errorKey, result);
    setErrorsOnField(confirmationField, errorKey, result);
    return result;
  };
  return crossFieldValidators;
}

function setErrorsOnField(
  field: AbstractControl | null,
  errorKey: string,
  error: ValidationErrors | null
) {
  let fieldErrors = field?.errors || {};
  delete fieldErrors[errorKey];
  if (error) {
    fieldErrors = { ...fieldErrors, ...error };
  }
  field?.setErrors(formatErrors(fieldErrors));
}

function formatErrors(field: ValidationErrors) {
  return Object.keys(field).length > 0 ? field : null;
}
