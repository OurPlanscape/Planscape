import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { of } from 'rxjs';
import { FavoriteDataLayersComponent } from '@data-layers/favorite-data-layers/favorite-data-layers.component';
import { DynamicDataLayersComponent } from './dynamic-data-layers.component';
import { DataLayersRegistryService } from '../data-layers-registry';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MockDeclaration } from 'ng-mocks';

/** Stands in for the map viewer, which owns the map tabs template. */
@Component({ standalone: true, template: `<ng-template #tabs></ng-template>` })
class TabsHostComponent {
  @ViewChild('tabs', { static: true }) tabs!: TemplateRef<unknown>;
}

describe('DynamicDataLayersComponent', () => {
  let fixture: ComponentFixture<DynamicDataLayersComponent>;
  let component: DynamicDataLayersComponent;

  // what the favorites panel reads as soon as it is created
  const mockStateService = {
    favorites$: of({ isLoading: false, data: [] }),
    canEditFavorites$: of(false),
    loadingLayer$: of(false),
    viewedDataLayer$: of(null),
    selectedDataLayers$: of([]),
    getMaxSelectedLayers: () => 3,
  } as unknown as DataLayersStateService;
  const mockRegistry = {
    get: jasmine.createSpy('get').and.returnValue(mockStateService),
  };

  beforeEach(() => {
    mockRegistry.get = jasmine
      .createSpy('get')
      .and.returnValue(mockStateService); // <-- reinitialize spy

    TestBed.configureTestingModule({
      imports: [DynamicDataLayersComponent],
      providers: [
        { provide: DataLayersRegistryService, useValue: mockRegistry },
      ],
      declarations: [MockDeclaration(DataLayersComponent)],
    });

    fixture = TestBed.createComponent(DynamicDataLayersComponent);
    component = fixture.componentInstance;
  });

  it('should throw if mapId is missing from registry', () => {
    mockRegistry.get.and.returnValue(undefined);
    component.mapId = 42;

    expect(() => fixture.detectChanges()).toThrowError(
      'No DataLayersStateService for map 42'
    );
  });

  it('should create and inject DataLayersComponent dynamically', fakeAsync(() => {
    component.mapId = 1;
    fixture.detectChanges();
    tick();

    const createdComponent = component['componentRef']?.instance;
    expect(createdComponent instanceof DataLayersComponent).toBeTrue();
  }));

  it('should destroy the dynamic component on ngOnDestroy', () => {
    component.mapId = 1;
    fixture.detectChanges();

    const destroySpy = spyOn(
      component['componentRef']!,
      'destroy'
    ).and.callThrough();

    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
  });

  it('hands the map tabs to the favorites panel too', fakeAsync(() => {
    const host = TestBed.createComponent(TabsHostComponent);
    host.detectChanges();
    component.mapId = 1;
    component.panel = 'favorites';
    component.belowSearch = host.componentInstance.tabs;

    fixture.detectChanges();
    tick();

    const panel = component['componentRef']
      ?.instance as FavoriteDataLayersComponent;
    expect(panel instanceof FavoriteDataLayersComponent).toBeTrue();
    expect(panel.belowSearch).toBe(host.componentInstance.tabs);
  }));
});
