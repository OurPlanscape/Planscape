import { AbstractControl } from '@angular/forms';

// Sync validator
export function nameMustBeNew(
  nameControl: AbstractControl,
  existingNames: string[]
): { [key: string]: any } | null {
  if (isDuplicateName(nameControl.value, existingNames)) {
    return { duplicate: true };
  }
  return null;
}

// Helper method that checks if a name is included in a list of names
function isDuplicateName(name: string, existingNames: string[]): boolean {
  return existingNames.some(
    (existing) => existing.toLowerCase().trim() === name.toLowerCase().trim()
  );
}
