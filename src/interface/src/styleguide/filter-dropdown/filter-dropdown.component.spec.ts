import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { MenuCloseReason } from '@angular/material/menu';
import { FilterDropdownComponent } from './filter-dropdown.component';

type Item = { id: number; name: string };

describe('FilterDropdownComponent', () => {
  let component: FilterDropdownComponent<Item>;
  let fixture: ComponentFixture<FilterDropdownComponent<Item>>;

  const items: Item[] = [
    { id: 1, name: 'Alpha' },
    { id: 2, name: 'Beta' },
    { id: 3, name: 'Gamma' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterDropdownComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterDropdownComponent<Item>);
    component = fixture.componentInstance;
    component.menuLabel = 'Filters';
    component.menuItems = items;
    component.displayField = 'name';
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('initializes displayed items from menu items', () => {
    fixture.detectChanges();
    expect(component.displayedItems).toEqual(items);
  });

  it('toggles selections and emits changes', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.changedSelection, 'emit');
    const event = { stopPropagation: jasmine.createSpy('stopPropagation') } as
      | Event
      | any;

    component.toggleSelection(event, items[0]);
    expect(component.selectedItems).toEqual([items[0]]);
    expect(emitSpy).toHaveBeenCalledWith([items[0]]);
    expect(event.stopPropagation).toHaveBeenCalled();

    component.toggleSelection(event, items[0]);
    expect(component.selectedItems).toEqual([]);
    expect(emitSpy).toHaveBeenCalledWith([]);
  });

  it('builds selection text from display field', () => {
    component.selectedItems = [items[0], items[2]];

    expect(component.selectionText).toBe(': Alpha, Gamma');
  });

  it('filters items using the search term', () => {
    fixture.detectChanges();

    component.filterSearch('al');
    expect(component.displayedItems).toEqual([items[0]]);

    component.filterSearch('');
    expect(component.displayedItems).toEqual(items);
  });

  it('restores selections on cancel', () => {
    component.selectedItems = [items[1]];
    component.searchTerm = 'be';
    component.openFilterPanel();

    component.selectedItems = [items[0]];
    component.handleCancel();

    expect(component.selectedItems).toEqual([items[1]]);
    expect(component.searchTerm).toBe('be');
  });

  it('clears selections and emits when clearing', () => {
    component.selectedItems = [items[0]];
    component.searchTerm = 'al';
    const emitSpy = spyOn(component.changedSelection, 'emit');
    const event = { stopPropagation: jasmine.createSpy('stopPropagation') } as
      | Event
      | any;

    component.clearSelections(event);

    expect(component.selectedItems).toEqual([]);
    expect(component.searchTerm).toBe('');
    expect(emitSpy).toHaveBeenCalledWith([]);
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('confirms selections on apply', () => {
    component.selectedItems = [items[2]];
    const confirmSpy = spyOn(component.confirmedSelection, 'emit');

    component.applyChanges({} as Event);

    expect(confirmSpy).toHaveBeenCalledWith([items[2]]);
  });

  it('uses size host bindings', () => {
    component.size = 'large';
    fixture.detectChanges();

    expect(component.isLarge).toBeTrue();
    expect(component.isMedium).toBeFalse();
    expect(component.isSmall).toBeFalse();
  });

  it('cancels selections when menu closes without click', () => {
    component.selectedItems = [items[0]];
    component.openFilterPanel();
    component.selectedItems = [items[2]];

    component.handleClosedMenu('keydown' as MenuCloseReason);

    expect(component.selectedItems).toEqual([items[0]]);
  });
});
