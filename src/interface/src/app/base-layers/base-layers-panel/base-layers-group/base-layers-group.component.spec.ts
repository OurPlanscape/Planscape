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

  it('fetches only once even when the dataset has no layers', () => {
    listSpy.and.returnValue(of([]));
    fixture.detectChanges();
    const header = fixture.debugElement.query(By.css('.group-header'));

    header.nativeElement.click();
    header.nativeElement.click();
    header.nativeElement.click();

    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('collapses again on a second click', () => {
    fixture.componentRef.setInput('initialExpanded', true);
    fixture.detectChanges();

    fixture.debugElement.query(By.css('.group-header')).nativeElement.click();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.group-content'))).toBeNull();
  });

  it('emits the new expanded state when toggled', () => {
    const emitted: boolean[] = [];
    component.expandedChange.subscribe((e) => emitted.push(e));

    const header = fixture.debugElement.query(By.css('.group-header'));
    header.nativeElement.click();
    header.nativeElement.click();

    expect(emitted).toEqual([true, false]);
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

  describe('single selection', () => {
    let stateService: BaseLayersStateService;

    beforeEach(() => {
      stateService = TestBed.inject(BaseLayersStateService);
      fixture.componentRef.setInput('dataSet', {
        ...dataSet,
        selection_type: 'SINGLE',
      });
      fixture.componentRef.setInput('initialExpanded', true);
      fixture.componentRef.setInput('layers', [layer(5, 'Fire Perimeters')]);
      fixture.detectChanges();
    });

    it('renders toggles instead of radio buttons', () => {
      expect(fixture.debugElement.queryAll(By.css('sg-toggle')).length).toBe(1);
      expect(fixture.debugElement.query(By.css('mat-radio-button'))).toBeNull();
    });

    it('emits a single selection when toggled on', () => {
      const emitted: { layer: BaseLayer; isMulti: boolean }[] = [];
      component.layerSelected.subscribe((e) => emitted.push(e));
      const target = layer(5, 'Fire Perimeters');

      component.onLayerToggle(target, true);

      expect(emitted).toEqual([{ layer: target, isMulti: false }]);
    });

    it('removes the layer when toggled off', () => {
      const removeSpy = spyOn(stateService, 'removeBaseLayer');
      const emitted: unknown[] = [];
      component.layerSelected.subscribe((e) => emitted.push(e));
      const target = layer(5, 'Fire Perimeters');

      component.onLayerToggle(target, false);

      expect(removeSpy).toHaveBeenCalledWith(target);
      expect(emitted).toEqual([]);
    });
  });
});
