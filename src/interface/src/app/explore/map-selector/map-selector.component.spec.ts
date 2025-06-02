import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapSelectorComponent } from './map-selector.component';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MultiMapConfigState } from 'src/app/maplibre-map/multi-map-config.state';

describe('MapSelectorComponent', () => {
  let component: MapSelectorComponent;
  let fixture: ComponentFixture<MapSelectorComponent>;

  let layoutModeMock$: BehaviorSubject<number>;
  let selectedMapIdMock$: BehaviorSubject<number>;
  let setSelectedMapSpy: jasmine.Spy;

  beforeEach(async () => {
    layoutModeMock$ = new BehaviorSubject(4);
    selectedMapIdMock$ = new BehaviorSubject(1);
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create an array of map numbers based on layoutMode$', async () => {
    const result = await firstValueFrom(component.mapsArray$);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('should call setSelectedMap with a given id when a map is clicked', () => {
    component.setSelectedMap(3);
    expect(setSelectedMapSpy).toHaveBeenCalledWith(3);
  });

  it('should update mapsArray$ when layoutMode$ changes', async () => {
    layoutModeMock$.next(2);
    fixture.detectChanges();
    const result = await firstValueFrom(component.mapsArray$);
    expect(result).toEqual([1, 2]);
  });
});
