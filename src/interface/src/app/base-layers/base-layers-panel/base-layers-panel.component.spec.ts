import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  BaseLayersPanelComponent,
  groupSearchResults,
} from './base-layers-panel.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '../base-layers.state.service';
import { of, Subject } from 'rxjs';
import { MapModuleService } from '@services/map-module.service';
import { DataLayersService } from '@services/data-layers.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MapDataDataSet, SearchResult } from '@types';

const wildfires = { id: 1, name: 'Wildfires' } as MapDataDataSet;
const roads = { id: 2, name: 'Roads' } as MapDataDataSet;
const ownership = { id: 3, name: 'Ownership' } as MapDataDataSet;

function layerResult(id: number, dataSetId: number): SearchResult {
  return {
    id,
    name: `Layer ${id}`,
    type: 'DATALAYER',
    data: { id, name: `Layer ${id}`, dataset: { id: dataSetId } },
  } as unknown as SearchResult;
}

function dataSetResult(id: number): SearchResult {
  return { id, name: `Dataset ${id}`, type: 'DATASET' } as SearchResult;
}

describe('BaseLayersPanelComponent', () => {
  let component: BaseLayersPanelComponent;
  let fixture: ComponentFixture<BaseLayersPanelComponent>;
  let searchSpy: jasmine.Spy;

  beforeEach(async () => {
    searchSpy = jasmine
      .createSpy('search')
      .and.returnValue(of({ count: 0, results: [] }));

    await TestBed.configureTestingModule({
      imports: [BaseLayersPanelComponent, MatSnackBarModule],
      providers: [
        MockProvider(MapModuleService, {
          datasets$: of({
            main_datasets: [],
            base_datasets: [wildfires, roads],
            categories: [],
          }),
          moduleName: 'map',
        }),
        MockProvider(DataLayersService, {
          search: searchSpy,
          listBaseLayersByDataSet: () => of([]),
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseLayersPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the search bar', () => {
    expect(fixture.debugElement.query(By.css('sg-search-bar'))).toBeTruthy();
  });

  it('lists every base dataset while not searching', () => {
    expect(
      fixture.debugElement.queryAll(By.css('app-base-layers-group')).length
    ).toBe(2);
  });

  it('searches vector layers in the current module', () => {
    component.search('fire');
    fixture.detectChanges();

    expect(searchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ term: 'fire', type: 'VECTOR', module: 'map' })
    );
  });

  it('shows one list per dataset with matching layers', () => {
    searchSpy.and.returnValue(
      of({ count: 2, results: [layerResult(10, 1), layerResult(11, 1)] })
    );
    component.search('fire');
    fixture.detectChanges();

    const lists = fixture.debugElement.queryAll(
      By.css('app-base-layers-group')
    );
    expect(lists.length).toBe(1);
    expect(lists[0].componentInstance.layers.length).toBe(2);
    expect(lists[0].componentInstance.searchTerm).toBe('fire');
  });

  it('shows no results when nothing matches', () => {
    component.search('nope');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('sg-no-results'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-base-layers-group'))
    ).toBeNull();
  });

  it('shows only a spinner while a new search is in flight', () => {
    searchSpy.and.returnValue(of({ count: 1, results: [layerResult(10, 1)] }));
    component.search('fire');
    fixture.detectChanges();

    const pending = new Subject<{ count: number; results: SearchResult[] }>();
    searchSpy.and.returnValue(pending);
    component.search('road');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.loader'))).toBeTruthy();
    expect(
      fixture.debugElement.query(By.css('app-base-layers-group'))
    ).toBeNull();
    expect(fixture.debugElement.query(By.css('sg-no-results'))).toBeNull();
  });

  it('says when the backend had more matches than the limit', () => {
    searchSpy.and.returnValue(
      of({ count: 150, results: [layerResult(10, 1)] })
    );
    component.search('fire');
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.truncated-hint'))).toBeTruthy();
  });

  it('goes back to browsing all datasets when the search is cleared', () => {
    component.search('nope');
    fixture.detectChanges();
    component.clearSearch();
    fixture.detectChanges();

    expect(
      fixture.debugElement.queryAll(By.css('app-base-layers-group')).length
    ).toBe(2);
    expect(searchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('groupSearchResults', () => {
  it('groups layers by dataset in the module dataset order', () => {
    const groups = groupSearchResults(
      [layerResult(20, 2), layerResult(10, 1), layerResult(21, 2)],
      [wildfires, roads, ownership]
    );

    expect(groups.map((g) => g.dataSet.id)).toEqual([1, 2]);
    expect(groups[1].layers?.map((l) => l.id)).toEqual([20, 21]);
  });

  it('includes datasets that only matched by name, without preloaded layers', () => {
    const groups = groupSearchResults(
      [dataSetResult(3)],
      [wildfires, ownership]
    );

    expect(groups).toEqual([{ dataSet: ownership, layers: null }]);
  });

  it('prefers layer matches over a dataset match', () => {
    const groups = groupSearchResults(
      [dataSetResult(1), layerResult(10, 1)],
      [wildfires]
    );

    expect(groups[0].layers?.map((l) => l.id)).toEqual([10]);
  });

  it('ignores results from datasets outside the module', () => {
    expect(
      groupSearchResults([layerResult(99, 42), dataSetResult(42)], [wildfires])
    ).toEqual([]);
  });
});
