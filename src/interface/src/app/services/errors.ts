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
