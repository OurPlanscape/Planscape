import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { MapSelectorComponent } from '@app/explore/map-selector/map-selector.component';
import { BehaviorSubject, skip } from 'rxjs';
import { MultiMapConfigState } from '@app/maplibre-map/multi-map-config.state';
import { DataLayersRegistryService } from '@app/explore/data-layers-registry';
import { DynamicDataLayersComponent } from '@app/explore/dynamic-data-layers/dynamic-data-layers.component';
import { MockDeclaration } from 'ng-mocks';

describe('MapSelectorComponent', () => {
  let component: MapSelectorComponent;
  let fixture: ComponentFixture<MapSelectorComponent>;

  let layoutModeMock$: BehaviorSubject<number>;
  let selectedMapIdMock$: BehaviorSubject<number>;
  let sizeMock$: BehaviorSubject<number>;
  let setSelectedMapSpy: jasmine.Spy;

  beforeEach(async () => {
    layoutModeMock$ = new BehaviorSubject(4);
    selectedMapIdMock$ = new BehaviorSubject(1);
    sizeMock$ = new BehaviorSubject(0);
    setSelectedMapSpy = jasmine.createSpy('setSelectedMap');

    const multiMapConfigStateMock = {
      layoutMode$: layoutModeMock$.asObservable(),
      selectedMapId$: selectedMapIdMock$.asObservable(),
      setSelectedMap: setSelectedMapSpy,
    };

    await TestBed.configureTestingModule({
      imports: [MapSelectorComponent],
      providers: [
        { provide: MultiMapConfigState, useValue: multiMapConfigStateMock },
        { provide: DataLayersRegistryService, useValue: { size$: sizeMock$ } },
      ],
      declarations: [MockDeclaration(DynamicDataLayersComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(MapSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create an array of map numbers based on DataLayersRegistryService', fakeAsync(() => {
    sizeMock$.next(4);
    component.mapsArray$.pipe(skip(1)).subscribe((s) => {
      expect(s).toEqual([1, 2, 3, 4]);
    });
    tick();
  }));

  it('should call setSelectedMap with a given id when a map is clicked', () => {
    component.setSelectedMap(3);
    expect(setSelectedMapSpy).toHaveBeenCalledWith(3);
  });
});
