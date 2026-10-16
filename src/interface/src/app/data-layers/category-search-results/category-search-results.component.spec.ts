import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DataLayer, SimpleCategory } from '@types';
import { DataLayersStateService } from '../data-layers.state.service';
import { CategorySearchResultsComponent } from './category-search-results.component';

describe('CategorySearchResultsComponent', () => {
  let component: CategorySearchResultsComponent;
  let fixture: ComponentFixture<CategorySearchResultsComponent>;
  let state: DataLayersStateService;

  const fire: SimpleCategory = { id: 1, name: 'Fire', icon: null };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategorySearchResultsComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: of(null),
          selectedDataLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategorySearchResultsComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(DataLayersStateService);
    spyOn(state, 'resetPath');
    spyOn(state, 'selectCategory');
    spyOn(state, 'goToDataLayerCategory');
    fixture.detectChanges();
  });

  it('renders a group per category', () => {
    const layer = { id: 10, simple_categories: [fire] } as DataLayer;
    component.results = {
      categories: [],
      dataSets: [],
      groupedLayers: [
        {
          category: fire,
          layers: [
            { id: 10, name: 'L', type: 'DATALAYER', url: '', data: layer },
          ],
        },
      ],
    };
    fixture.detectChanges();
    const names = fixture.nativeElement.querySelectorAll('.data-set-name');
    expect(names.length).toBe(1);
    expect(names[0].textContent).toContain('Fire');
  });

  it('browses the group category', () => {
    component.goToGroup({ category: fire, layers: [] });
    expect(state.resetPath).toHaveBeenCalled();
    expect(state.selectCategory).toHaveBeenCalledWith(fire);
  });

  it('falls back to the dataset for uncategorized layers', () => {
    const layer = { id: 10 } as DataLayer;
    component.goToGroup({
      category: null,
      layers: [{ id: 10, name: 'L', type: 'DATALAYER', url: '', data: layer }],
    });
    expect(state.goToDataLayerCategory).toHaveBeenCalledWith(layer);
  });
});
