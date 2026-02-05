import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncedMapsComponent } from './synced-maps.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { ExploreMapComponent } from '@maplibre/explore-map/explore-map.component';
import { MultiMapConfigState } from '../multi-map-config.state';
import { of } from 'rxjs';
import { LngLatBounds } from 'maplibre-gl';
import { DummyMaplibreMap } from '../maplibre.mock.spec';

describe('SyncedMapsComponent', () => {
  let fixture: ComponentFixture<SyncedMapsComponent>;
  let component: SyncedMapsComponent;
  let state: jasmine.SpyObj<MultiMapConfigState>;

  beforeEach(async () => {
    state = jasmine.createSpyObj('MultiMapConfigState', [
      'loadStateFromLocalStorage',
      'saveStateToLocalStorage',
      'layoutMode$',
    ]);
    (state.layoutMode$ as any) = of(1);

    await TestBed.configureTestingModule({
      imports: [SyncedMapsComponent],
      providers: [MockProvider(MultiMapConfigState, state)],
      declarations: [MockDeclaration(ExploreMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncedMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // clear any stub maps before the automatic fixture.destroy()
  afterEach(() => {
    component['maps'].clear();
  });

  it('should create and load state', () => {
    expect(component).toBeTruthy();
    expect(state.loadStateFromLocalStorage).toHaveBeenCalled();
    expect(component.layoutMode).toBe(1);
  });

  describe('mapCreated()', () => {
    it('assigns a cleanupFn on first mapCreated', async () => {
      await component.mapCreated({
        map: new DummyMaplibreMap() as any,
        mapNumber: 1,
      });
      expect(component['cleanupFn']).toBeDefined();
      expect(typeof component['cleanupFn']).toBe('function');
    });

    it('calls previous cleanupFn when a new map is added', async () => {
      // first create
      await component.mapCreated({
        map: new DummyMaplibreMap() as any,
        mapNumber: 1,
      });
      // overwrite it with a spy
      const cleanupSpy = jasmine.createSpy('cleanup');
      component['cleanupFn'] = cleanupSpy;

      // second create should invoke the old cleanupSpy
      await component.mapCreated({
        map: new DummyMaplibreMap() as any,
        mapNumber: 2,
      });
      expect(cleanupSpy).toHaveBeenCalled();

      // and set a brand-new cleanupFn afterward
      expect(component['cleanupFn']).toBeDefined();
      expect(component['cleanupFn']).not.toBe(cleanupSpy);
    });
  });

  describe('saveState()', () => {
    it('does nothing if map #1 is missing', () => {
      component.saveState();
      expect(state.saveStateToLocalStorage).not.toHaveBeenCalled();
    });

    it('saves bounds when map #1 exists', () => {
      // stub map #1 to return real bounds
      const fakeBounds = new LngLatBounds([0, 1], [2, 3]);
      const mapMock = { getBounds: () => fakeBounds } as any;
      component['maps'].set(1, mapMock);

      component.saveState();
      expect(state.saveStateToLocalStorage).toHaveBeenCalledWith([0, 1, 2, 3]);
    });
  });

  describe('lifecycle listeners', () => {
    it('calls saveState on beforeunload()', () => {
      const spy = spyOn(component, 'saveState');
      (component as any).beforeUnload();
      expect(spy).toHaveBeenCalled();
    });

    it('calls saveState on ngOnDestroy()', () => {
      const spy = spyOn(component, 'saveState');
      component.ngOnDestroy();
      expect(spy).toHaveBeenCalled();
    });
  });
});
