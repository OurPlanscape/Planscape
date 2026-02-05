import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { DynamicDataLayersComponent } from './dynamic-data-layers.component';
import { DataLayersRegistryService } from '../data-layers-registry';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MockDeclaration } from 'ng-mocks';

describe('DynamicDataLayersComponent', () => {
  let fixture: ComponentFixture<DynamicDataLayersComponent>;
  let component: DynamicDataLayersComponent;

  const mockStateService = {} as DataLayersStateService;
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
});
