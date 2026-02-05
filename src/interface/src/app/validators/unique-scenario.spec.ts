import { FormControl } from '@angular/forms';
import { nameMustBeNew } from '@app/validators/unique-scenario';

describe('Scenario name validators', () => {
  describe('nameMustBeNew (sync validator)', () => {
    it('should return null if the name is not in the list', () => {
      const control = new FormControl('unique name');
      const existingNames = ['Scenario A', 'Scenario B'];
      const result = nameMustBeNew(control, existingNames);
      expect(result).toBeNull();
    });

    it('should return duplicate error if the name exists (case insensitive)', () => {
      const control = new FormControl('scenario a');
      const existingNames = ['Scenario A', 'Scenario B'];
      const result = nameMustBeNew(control, existingNames);
      expect(result).toEqual({ duplicate: true });
    });

    it('should return duplicate error if the name has leading/trailing spaces', () => {
      const control = new FormControl('   Scenario B   ');
      const existingNames = ['Scenario A', 'Scenario B'];
      const result = nameMustBeNew(control, existingNames);
      expect(result).toEqual({ duplicate: true });
    });

    it('should return null if the name is null or empty', () => {
      const control = new FormControl('');
      const result = nameMustBeNew(control, []);
      expect(result).toBeNull();
    });
  });
});
