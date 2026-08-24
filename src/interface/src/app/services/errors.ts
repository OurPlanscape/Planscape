export class CreateScenarioError extends Error {
  constructor(
    message: string,
    public options: {
      configurationError?: boolean;
      errorMessages?: Record<string, string[]>;
    } = {}
  ) {
    super(message);
  }

  // Configuration error is true if the error we get is related to a particular configuration field
  get configurationError(): boolean {
    return this.options.configurationError ?? false;
  }

  // If we have configuration errors we could have a list of error messages per field key i.e included_areas: ['error message']
  get errorMessages(): Record<string, string[]> {
    return this.options.errorMessages ?? {};
  }
}

export class InvalidCoordinatesError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Backend validation errors come back as
 * `{ detail: 'Validation error.', errors: { name: ['...'] } }`.
 * Returns the first message for `field`, or null if the response isn't a
 * validation error for that field.
 */
export function getFieldError(error: unknown, field: string): string | null {
  const errors = (error as { error?: { errors?: Record<string, unknown> } })
    ?.error?.errors;
  const messages = errors?.[field];
  if (Array.isArray(messages) && typeof messages[0] === 'string') {
    return messages[0];
  }
  return typeof messages === 'string' ? messages : null;
}
