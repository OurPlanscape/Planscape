import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { DataLayersService } from '@services/data-layers.service';
import { MapModuleService } from '@services/map-module.service';
import { BaseLayer, MapDataDataSet } from '@types';
import { BaseLayersGroupComponent } from './base-layers-group.component';

const dataSet = {
  id: 1,
  name: 'Wildfires',
  selection_type: 'MULTIPLE',
} as MapDataDataSet;

function layer(id: number, name: string): BaseLayer {
  return { id, name, path: [], styles: [{ data: {} }] } as unknown as BaseLayer;
}

describe('BaseLayersGroupComponent', () => {
  let component: BaseLayersGroupComponent;
  let fixture: ComponentFixture<BaseLayersGroupComponent>;
  let listSpy: jasmine.Spy;

  beforeEach(async () => {
    listSpy = jasmine
      .createSpy('listBaseLayersByDataSet')
      .and.returnValue(of([layer(2, 'Zeta'), layer(1, 'Alpha')]));

    await TestBed.configureTestingModule({
      imports: [BaseLayersGroupComponent, MatSnackBarModule],
      providers: [
        MockProvider(BaseLayersStateService, {
          loadingLayers$: of([]),
        }),
        MockProvider(DataLayersService, { listBaseLayersByDataSet: listSpy }),
        MockProvider(MapModuleService, { moduleName: 'map' }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseLayersGroupComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dataSet', dataSet);
  });

  function layerNames() {
    return fixture.debugElement
      .queryAll(By.css('.layer-name'))
      .map((el) => el.nativeElement.textContent.trim());
  }

  it('starts collapsed and fetches the dataset layers on expand', () => {
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.group-content'))).toBeNull();

    fixture.debugElement.query(By.css('.group-header')).nativeElement.click();
    fixture.detectChanges();

    expect(listSpy).toHaveBeenCalledWith(1, 'map');
    expect(layerNames()).toEqual(['Alpha', 'Zeta']);
  });

  it('collapses again on a second click', () => {
    fixture.componentRef.setInput('initialExpanded', true);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.group-header')).nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.group-content'))).toBeNull();
  });

  it('shows preloaded layers without fetching and highlights the term', () => {
    fixture.componentRef.setInput('initialExpanded', true);
    fixture.componentRef.setInput('layers', [layer(5, 'Fire Perimeters')]);
    fixture.componentRef.setInput('searchTerm', 'fire');
    fixture.detectChanges();

    expect(listSpy).not.toHaveBeenCalled();
    expect(layerNames()).toEqual(['Fire Perimeters']);
    expect(
      fixture.debugElement.query(By.css('.layer-name mark')).nativeElement
        .textContent
    ).toBe('Fire');
  });

  it('emits the layer and selection mode on change', () => {
    const emitted: { layer: BaseLayer; isMulti: boolean }[] = [];
    component.layerSelected.subscribe((e) => emitted.push(e));
    const target = layer(5, 'Fire Perimeters');

    component.onLayerChange(target, true);

    expect(emitted).toEqual([{ layer: target, isMulti: true }]);
  });
});
