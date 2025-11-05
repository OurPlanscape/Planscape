import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SelectableListComponent } from './selectable-list.component';

interface DemoItem {
  id: number;
  name: string;
  color?: string;
}

describe('SelectableListComponent', () => {
  let fixture: ComponentFixture<SelectableListComponent<DemoItem>>;
  let component: SelectableListComponent<DemoItem>;

  const A: DemoItem = { id: 1, name: 'Alpha', color: 'red' };
  const B: DemoItem = { id: 2, name: 'Beta', color: 'blue' };
  const C: DemoItem = { id: 3, name: 'Gamma', color: 'green' };

  type DemoItemWithNested = DemoItem & { styles?: { color?: string } };
  const D: DemoItemWithNested = {
    id: 4,
    name: 'Delta',
    styles: { color: '#123456' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectableListComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectableListComponent<DemoItem>);
    component = fixture.componentInstance;

    component.items = [A, B, C];
    component.selectedItems = [];
    component.viewedItems = [];

    fixture.detectChanges();
  });

  describe('isSelected / isViewed ', () => {
    it('returns true for same id even if object reference differs', () => {
      const copyB: DemoItem = { id: 2, name: 'B copy', color: 'blue' };
      const copyC: DemoItem = { id: 3, name: 'C copy', color: 'green' };

      component.selectedItems = [copyB];
      component.viewedItems = [copyC];

      expect(component.isSelected(B)).toBeTrue();
      expect(component.isViewed(C)).toBeTrue();
    });

    it('returns false when id not present', () => {
      expect(component.isSelected(A)).toBeFalse();
      expect(component.isViewed(A)).toBeFalse();
    });
  });

  describe('selectItem', () => {
    it('adds if not present and emits `selectedItemsChanged` with the new array', () => {
      const emitSpy = spyOn(component.selectedItemsChanged, 'emit');

      const prevRef = component.selectedItems;
      component.selectItem(A);

      expect(component.selectedItems).not.toBe(prevRef);
      expect(component.selectedItems).toEqual([A]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toBe(component.selectedItems);
    });

    it('removes when present and emits `selectedItemsChanged` with the new array', () => {
      component.selectedItems = [A, B];
      const emitSpy = spyOn(component.selectedItemsChanged, 'emit');

      const prevRef = component.selectedItems;
      component.selectItem(A);

      expect(component.selectedItems).not.toBe(prevRef);
      expect(component.selectedItems).toEqual([B]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual([B]);
    });

    it('toggles OFF when called with a different object that has the same id', () => {
      component.selectedItems = [A];
      const emitSpy = spyOn(component.selectedItemsChanged, 'emit');
      const sameIdDifferentRef: DemoItem = {
        id: 1,
        name: 'Alpha copy',
        color: 'red',
      };

      const prevRef = component.selectedItems;
      component.selectItem(sameIdDifferentRef);

      // removed by id (not by reference)
      expect(component.selectedItems.length).toBe(0);
      // immutable update
      expect(component.selectedItems).not.toBe(prevRef);
      // emitted once with current array
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual(
        component.selectedItems
      );
      // sanity: neither instance is considered selected
      expect(component.isSelected(A)).toBeFalse();
      expect(component.isSelected(sameIdDifferentRef)).toBeFalse();
    });

    it('always produces a fresh array reference across toggles', () => {
      const r1 = component.selectedItems;
      component.selectItem(A);
      const r2 = component.selectedItems;
      component.selectItem(A);
      const r3 = component.selectedItems;

      expect(r2).not.toBe(r1);
      expect(r3).not.toBe(r2);
    });
  });

  describe('viewItem', () => {
    it('adds when not present and emits the new array', () => {
      const emitSpy = spyOn(component.viewedItemsChanged, 'emit');

      const prevRef = component.viewedItems;
      component.viewItem(B);

      expect(component.viewedItems).not.toBe(prevRef);
      expect(component.viewedItems).toEqual([B]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toBe(component.viewedItems);
    });

    it('removes when present and emits the new array', () => {
      component.viewedItems = [B, C];
      const emitSpy = spyOn(component.viewedItemsChanged, 'emit');

      const prevRef = component.viewedItems;
      component.viewItem(B);

      expect(component.viewedItems).not.toBe(prevRef);
      expect(component.viewedItems).toEqual([C]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual([C]);
    });

    it('toggles OFF when called with a different ref that has the same id (viewItem)', () => {
      component.viewedItems = [C];
      const emitSpy = spyOn(component.viewedItemsChanged, 'emit');
      const sameIdDifferentRef: DemoItem = {
        id: 3,
        name: 'Gamma copy',
        color: 'green',
      };

      const prevRef = component.viewedItems;
      component.viewItem(sameIdDifferentRef);

      // removed
      expect(component.viewedItems.length).toBe(0);
      // immutable update
      expect(component.viewedItems).not.toBe(prevRef);

      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual(component.viewedItems);

      expect(component.isViewed(C)).toBeFalse();
      expect(component.isViewed(sameIdDifferentRef)).toBeFalse();
    });

    it('always produces a fresh array reference across toggles', () => {
      const r1 = component.viewedItems;
      component.viewItem(C);
      const r2 = component.viewedItems;
      component.viewItem(C);
      const r3 = component.viewedItems;

      expect(r2).not.toBe(r1);
      expect(r3).not.toBe(r2);
    });
  });

  describe('getColor', () => {
    beforeEach(() => {
      component.defaultColor = 'transparent';
      component.colorPath = undefined;
    });

    it('returns defaultColor when colorPath is not set', () => {
      const color = component.getColor(A);
      expect(color).toBe('transparent');
    });

    it('reads top-level color when colorPath="color"', () => {
      component.colorPath = 'color';
      const color = component.getColor(A);
      expect(color).toBe('red');
    });

    it('reads nested color when colorPath="styles.color"', () => {
      component.items = [A, B, C, D as DemoItem];
      component.colorPath = 'styles.color';

      const color = component.getColor(D as DemoItem);
      expect(color).toBe('#123456');
    });

    it('reads array index in very nested paths: "nested[0].properties.color"', () => {
      // Arrange: item with array nesting
      const withArray: DemoItem & {
        nested: Array<{ properties: { color: string } }>;
      } = {
        id: 7,
        name: 'Eta',
        nested: [{ properties: { color: '#abcdef' } }],
      };
      component.colorPath = 'nested[0].properties.color';

      // Act
      const color = (component as any).getColor(withArray);

      // Assert
      expect(color).toBe('#abcdef');
    });

    it('returns defaultColor + logs when array index is out of bounds', () => {
      const spyErr = spyOn(console, 'error');
      const withArray: DemoItem & {
        nested: Array<{ properties?: { color?: string } }>;
      } = {
        id: 8,
        name: 'Theta',
        nested: [], // empty
      };
      component.colorPath = 'nested[0].properties.color';
      component.defaultColor = 'transparent';

      const color = (component as any).getColor(withArray);

      expect(color).toBe('transparent');
      expect(spyErr).toHaveBeenCalledTimes(1);
      expect(String(spyErr.calls.mostRecent().args[0])).toContain(
        'colorPath "nested[0].properties.color" not found'
      );
    });

    it('logs an error if path is missing/undefined', () => {
      component.colorPath = 'styles.color';
      const spyErr = spyOn(console, 'error');

      const missing: DemoItemWithNested = { id: 5, name: 'Epsilon' };
      const color = component.getColor(missing as DemoItem);

      expect(color).toBe('transparent');
      expect(spyErr).toHaveBeenCalledTimes(1);
      expect(String(spyErr.calls.mostRecent().args[0])).toContain(
        'colorPath "styles.color" not found'
      );
      expect(spyErr.calls.mostRecent().args[1]).toEqual(missing);
    });

    it('logs error if path is not valid', () => {
      component.colorPath = 'styles.color';
      const spyErr = spyOn(console, 'error');

      const withStylesButNoColor: DemoItemWithNested = {
        id: 6,
        name: 'Zeta',
        styles: {},
      };
      const color = component.getColor(withStylesButNoColor as DemoItem);

      expect(color).toBe('transparent');
      expect(spyErr).toHaveBeenCalledTimes(1);
      expect(String(spyErr.calls.mostRecent().args[0])).toContain(
        'colorPath "styles.color" not found'
      );
    });
  });
});
