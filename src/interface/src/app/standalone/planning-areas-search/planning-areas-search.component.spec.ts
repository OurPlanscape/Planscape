import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreasSearchComponent } from './planning-areas-search.component';
import { SearchBarComponent } from '../../../styleguide/search-bar/search-bar.component';

describe('PlanningAreasSearchComponent', () => {
  let component: PlanningAreasSearchComponent;
  let fixture: ComponentFixture<PlanningAreasSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent, PlanningAreasSearchComponent],
      declarations: [],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanningAreasSearchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize historyItems from sessionStorage', () => {
    const mockHistoryItems = ['item1', 'item2'];
    sessionStorage.setItem(component.key, JSON.stringify(mockHistoryItems));

    // Recreate the component to reload sessionStorage values
    fixture = TestBed.createComponent(PlanningAreasSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.historyItems).toEqual(mockHistoryItems);
  });

  it('should add a new search string to historyItems and sessionStorage', () => {
    spyOn(component.search, 'emit');
    component.searchString('newSearch');
    expect(component.historyItems).toContain('newSearch');
    expect(JSON.parse(sessionStorage.getItem(component.key) || '[]')).toContain(
      'newSearch'
    );
    expect(component.search.emit).toHaveBeenCalledWith('newSearch');
  });

  it('should not add a duplicate search string to historyItems', () => {
    component.historyItems = ['existingSearch'];
    sessionStorage.setItem(component.key, JSON.stringify(['existingSearch']));
    component.searchString('existingSearch');
    expect(component.historyItems.length).toBe(1);
    expect(
      JSON.parse(sessionStorage.getItem(component.key) || '[]').length
    ).toBe(1);
  });

  it('should emit the search event with the search string', () => {
    spyOn(component.search, 'emit');
    const searchString = 'testSearch';
    component.searchString(searchString);
    expect(component.search.emit).toHaveBeenCalledWith(searchString);
  });
});
