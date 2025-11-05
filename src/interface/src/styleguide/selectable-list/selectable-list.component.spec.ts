import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SelectableListComponent } from './selectable-list.component';

interface Item {
  id: number;
  name: string;
  color: string;
}

fdescribe('SelectableListComponent (methods)', () => {
  let fixture: ComponentFixture<SelectableListComponent<Item>>;
  let component: SelectableListComponent<Item>;

  const A: Item = { id: 1, name: 'Alpha', color: 'red' };
  const B: Item = { id: 2, name: 'Beta', color: 'blue' };
  const C: Item = { id: 3, name: 'Gamma', color: 'green' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Standalone component: just import it. No template override.
      imports: [SelectableListComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectableListComponent<Item>);
    component = fixture.componentInstance;

    // set initial @Inputs (not strictly needed for these tests, but realistic)
    component.items = [A, B, C];
    component.selectedItems = [];
    component.viewedItems = [];

    fixture.detectChanges();
  });

  describe('isSelected / isViewed (id equality)', () => {
    it('returns true for same id even if object reference differs', () => {
      const copyB: Item = { id: 2, name: 'B copy', color: 'blue' };
      const copyC: Item = { id: 3, name: 'C copy', color: 'green' };

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
    it('adds when item is not present and emits the new array', () => {
      const emitSpy = spyOn(component.selectedItemsChanged, 'emit');

      const prevRef = component.selectedItems;
      component.selectItem(A);

      expect(component.selectedItems).not.toBe(prevRef); // new array
      expect(component.selectedItems).toEqual([A]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual([A]);
      expect(emitSpy.calls.mostRecent().args[0]).toBe(component.selectedItems); // emitted ref matches current
    });

    it('removes when present and emits the new array', () => {
      component.selectedItems = [A, B];
      const emitSpy = spyOn(component.selectedItemsChanged, 'emit');

      const prevRef = component.selectedItems;
      component.selectItem(A);

      expect(component.selectedItems).not.toBe(prevRef);
      expect(component.selectedItems).toEqual([B]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual([B]);
      expect(emitSpy.calls.mostRecent().args[0]).toBe(component.selectedItems);
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

  describe('viewItem ', () => {
    it('adds when not present and emits the new array', () => {
      const emitSpy = spyOn(component.viewedItemsChanged, 'emit');

      const prevRef = component.viewedItems;
      component.viewItem(B);

      expect(component.viewedItems).not.toBe(prevRef);
      expect(component.viewedItems).toEqual([B]);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy.calls.mostRecent().args[0]).toEqual([B]);
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
      expect(emitSpy.calls.mostRecent().args[0]).toBe(component.viewedItems);
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
});
