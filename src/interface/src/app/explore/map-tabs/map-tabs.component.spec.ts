import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MockComponent } from 'ng-mocks';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { DynamicDataLayersComponent } from '@explore/dynamic-data-layers/dynamic-data-layers.component';
import { DataLayersRegistryService } from '../data-layers-registry';
import { MapTabsComponent } from './map-tabs.component';

describe('MapTabsComponent', () => {
  let component: MapTabsComponent;
  let fixture: ComponentFixture<MapTabsComponent>;
  let selectedMapId$: BehaviorSubject<number>;
  let setSelectedMapSpy: jasmine.Spy;

  beforeEach(async () => {
    selectedMapId$ = new BehaviorSubject(1);
    setSelectedMapSpy = jasmine
      .createSpy('setSelectedMap')
      .and.callFake((id: number) => selectedMapId$.next(id));

    await TestBed.configureTestingModule({
      imports: [MapTabsComponent],
      providers: [
        {
          provide: MultiMapConfigState,
          useValue: {
            layoutMode$: new BehaviorSubject(2),
            selectedMapId$,
            setSelectedMap: setSelectedMapSpy,
          },
        },
        {
          provide: DataLayersRegistryService,
          useValue: { size$: new BehaviorSubject(2) },
        },
      ],
    })
      .overrideComponent(MapTabsComponent, {
        remove: { imports: [DynamicDataLayersComponent] },
        add: { imports: [MockComponent(DynamicDataLayersComponent)] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(MapTabsComponent);
    component = fixture.componentInstance;
  });

  function dataLayers() {
    return fixture.debugElement
      .queryAll(By.css('app-dynamic-data-layers'))
      .map((de) => de.componentInstance as DynamicDataLayersComponent);
  }

  it('renders the data layers of the selected map only', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(dataLayers().map((d) => d.mapId)).toEqual([1]);

    selectedMapId$.next(2);
    fixture.detectChanges();
    expect(dataLayers().map((d) => d.mapId)).toEqual([2]);
  }));

  it('hands the map tabs to the data layers, below the search', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const [layers] = dataLayers();
    expect(layers.belowSearch).toEqual(jasmine.any(TemplateRef));
    expect(layers.showSelectionHeader).toBeFalse();
  }));

  it('stays on Map 2 after clicking its tab', fakeAsync(() => {
    const renderTabs = () => {
      const [layers] = dataLayers();
      const view = layers.belowSearch!.createEmbeddedView(null);
      view.detectChanges();
      tick();
      view.detectChanges();
      const links = view.rootNodes.flatMap((n: HTMLElement) =>
        n.querySelectorAll ? Array.from(n.querySelectorAll('a')) : []
      ) as HTMLAnchorElement[];
      return { view, links };
    };

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const first = renderTabs();
    expect(first.links.map((a) => a.textContent?.trim())).toEqual([
      'Map 1',
      'Map 2',
    ]);
    first.links[1].click();
    fixture.detectChanges();
    first.view.destroy();

    // map 2's panel brings up its own tabs
    const second = renderTabs();
    fixture.detectChanges();
    tick();

    expect(setSelectedMapSpy.calls.allArgs()).toEqual([[2]]);
    expect(dataLayers().map((d) => d.mapId)).toEqual([2]);
    expect(second.links[1].classList).toContain('mdc-tab--active');
    second.view.destroy();
  }));

  it('selects the map for the picked tab', () => {
    component.selectMap(2);
    expect(setSelectedMapSpy).toHaveBeenCalledWith(2);
  });
});
