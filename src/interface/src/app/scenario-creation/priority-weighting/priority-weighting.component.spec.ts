import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SimpleChange } from '@angular/core';

import { PriorityWeightingComponent } from './priority-weighting.component';

interface TestItem {
  name: string;
  value: number;
}

describe('PriorityWeightingComponent', () => {
  let component: PriorityWeightingComponent<TestItem>;
  let fixture: ComponentFixture<PriorityWeightingComponent<TestItem>>;

  const setItems = (items: TestItem[]) => {
    const previous = component.items;
    component.items = items;
    component.ngOnChanges({
      items: new SimpleChange(previous, items, false),
    });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityWeightingComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent<PriorityWeightingComponent<TestItem>>(
      PriorityWeightingComponent
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges / buildWeights', () => {
    it('builds a FormGroup per item with name and value', () => {
      setItems([
        { name: 'Source Exposure', value: 1 },
        { name: 'Wildfire Hazard', value: 5 },
      ]);

      expect(component.weights.length).toBe(2);
      expect(component.weights.at(0).controls.name.value).toBe(
        'Source Exposure'
      );
      expect(component.weights.at(0).controls.value.value).toBe(1);
      expect(component.weights.at(1).controls.name.value).toBe(
        'Wildfire Hazard'
      );
      expect(component.weights.at(1).controls.value.value).toBe(5);
    });

    it('rebuilds (clears) weights when items input changes', () => {
      setItems([{ name: 'A', value: 1 }]);
      expect(component.weights.length).toBe(1);

      setItems([
        { name: 'B', value: 2 },
        { name: 'C', value: 3 },
      ]);
      expect(component.weights.length).toBe(2);
      expect(component.weights.at(0).controls.name.value).toBe('B');
    });
  });

  describe('value validators', () => {
    beforeEach(() => {
      setItems([{ name: 'A', value: 1 }]);
    });

    it('is invalid below the minimum (1)', () => {
      const ctrl = component.weights.at(0).controls.value;
      ctrl.setValue(0);
      expect(ctrl.invalid).toBe(true);
      expect(ctrl.errors?.['min']).toBeTruthy();
    });

    it('is invalid above the maximum (100)', () => {
      const ctrl = component.weights.at(0).controls.value;
      ctrl.setValue(101);
      expect(ctrl.invalid).toBe(true);
      expect(ctrl.errors?.['max']).toBeTruthy();
    });

    it('is valid within range', () => {
      const ctrl = component.weights.at(0).controls.value;
      ctrl.setValue(50);
      expect(ctrl.valid).toBe(true);
    });
  });

  describe('increment', () => {
    beforeEach(() => {
      setItems([{ name: 'A', value: 5 }]);
    });

    it('increases the value by 1 and marks dirty', () => {
      component.increment(0);
      const ctrl = component.weights.at(0).controls.value;
      expect(ctrl.value).toBe(6);
      expect(ctrl.dirty).toBe(true);
    });

    it('clamps at the maximum (100)', () => {
      component.weights.at(0).controls.value.setValue(100);
      component.increment(0);
      expect(component.weights.at(0).controls.value.value).toBe(100);
    });
  });

  describe('decrement', () => {
    beforeEach(() => {
      setItems([{ name: 'A', value: 5 }]);
    });

    it('decreases the value by 1 and marks dirty', () => {
      component.decrement(0);
      const ctrl = component.weights.at(0).controls.value;
      expect(ctrl.value).toBe(4);
      expect(ctrl.dirty).toBe(true);
    });

    it('clamps at the minimum (1)', () => {
      component.weights.at(0).controls.value.setValue(1);
      component.decrement(0);
      expect(component.weights.at(0).controls.value.value).toBe(1);
    });
  });

  describe('onWeightInput', () => {
    beforeEach(() => {
      setItems([{ name: 'A', value: 1 }]);
    });

    it('strips non-digit characters and writes the parsed number', () => {
      const input = document.createElement('input');
      input.value = '12a3';
      const event = { target: input } as unknown as Event;

      component.onWeightInput(event, 0);

      expect(input.value).toBe('123');
      expect(component.weights.at(0).controls.value.value).toBe(123);
    });

    it('sets the control to null when the field is cleared', () => {
      const input = document.createElement('input');
      input.value = '';
      const event = { target: input } as unknown as Event;

      component.onWeightInput(event, 0);

      expect(component.weights.at(0).controls.value.value).toBeNull();
    });
  });

  describe('clickSecondary (Reset to default)', () => {
    it('restores the original item values, discarding edits', () => {
      setItems([
        { name: 'A', value: 1 },
        { name: 'B', value: 2 },
      ]);
      component.weights.at(0).controls.value.setValue(75);
      component.weights.at(1).controls.value.setValue(99);

      component.clickSecondary();

      expect(component.weights.at(0).controls.value.value).toBe(1);
      expect(component.weights.at(1).controls.value.value).toBe(2);
    });
  });

  describe('cancel / apply', () => {
    it('cancel emits closed', () => {
      const spy = jasmine.createSpy('closed');
      component.closed.subscribe(spy);
      component.cancel();
      expect(spy).toHaveBeenCalled();
    });

    it('apply emits closed', () => {
      const spy = jasmine.createSpy('closed');
      component.closed.subscribe(spy);
      component.apply();
      expect(spy).toHaveBeenCalled();
    });
  });
});
