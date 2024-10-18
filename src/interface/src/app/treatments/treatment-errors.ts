export class UpdatingStandsError extends Error {
  constructor() {
    super('There was an error applying treatments. Please try again');
  }
}

export class RemovingStandsError extends Error {
  constructor() {
    super('There was an error removing treatments. Please try again');
  }
}

export class ReloadTreatmentError extends Error {
  constructor() {
    super('There was an error refreshing your treatments. Please try again');
  }
}
