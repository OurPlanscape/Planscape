import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MapSelectorComponent } from '@explore/map-selector/map-selector.component';
import { SidebarTabs } from '@explore/sidebar-tabs';
import { MockComponents } from 'ng-mocks';
import { ExploreSidebarComponent } from './explore-sidebar.component';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { DataLayersRegistryService } from '@explore/data-layers-registry';
import {
  BrowseSelection,
  DataLayersStateService,
} from '@data-layers/data-layers.state.service';
import { BehaviorSubject } from 'rxjs';

describe('ExploreSidebarComponent', () => {
  let component: ExploreSidebarComponent;
  let fixture: ComponentFixture<ExploreSidebarComponent>;
  let selection$: BehaviorSubject<BrowseSelection | null>;
  let dataLayersState: jasmine.SpyObj<DataLayersStateService>;

  beforeEach(async () => {
    selection$ = new BehaviorSubject<BrowseSelection | null>(null);
    dataLayersState = jasmine.createSpyObj<DataLayersStateService>(
      'DataLayersStateService',
      ['goBackToSearchResults'],
      { selection$ }
    );
    const registry = new DataLayersRegistryService();
    registry.set(1, dataLayersState);

    await TestBed.configureTestingModule({
      imports: [ExploreSidebarComponent],
      providers: [
        {
          provide: MultiMapConfigState,
          useValue: { selectedMapId$: new BehaviorSubject(1) },
        },
        { provide: DataLayersRegistryService, useValue: registry },
      ],
    })
      .overrideComponent(ExploreSidebarComponent, {
        remove: { imports: [MapSelectorComponent, BaseLayersComponent] },
        add: {
          imports: MockComponents(MapSelectorComponent, BaseLayersComponent),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ExploreSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the data layers panel by default', () => {
    expect(fixture.debugElement.query(By.css('app-map-selector'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-base-layers'))).toBeNull();
    expect(
      fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
        .textContent
    ).toContain('Data Layers');
  });

  it('shows the base layers panel when that tab is selected', () => {
    component.selectedTab = SidebarTabs.BASE_LAYERS;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-base-layers'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-map-selector'))).toBeNull();
  });

  it('hides the panel and keeps the rail when collapsed', () => {
    component.expanded = false;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.panel'))).toBeNull();
    expect(
      fixture.debugElement.query(By.css('app-sidebar-icon-rail'))
    ).toBeTruthy();
  });

  it('switches tab when a different rail item is picked', () => {
    spyOn(component.selectedTabChange, 'emit');
    component.selectItem(component.railItems[1]);

    expect(component.selectedTabChange.emit).toHaveBeenCalledWith(
      SidebarTabs.BASE_LAYERS
    );
  });

  it('collapses when the active rail item is picked again', () => {
    spyOn(component.expandedChange, 'emit');
    spyOn(component.selectedTabChange, 'emit');
    component.selectItem(component.railItems[0]);

    expect(component.expandedChange.emit).toHaveBeenCalledWith(false);
    expect(component.selectedTabChange.emit).not.toHaveBeenCalled();
  });

  it('expands when a rail item is picked while collapsed', () => {
    component.expanded = false;
    spyOn(component.expandedChange, 'emit');
    component.selectItem(component.railItems[0]);

    expect(component.expandedChange.emit).toHaveBeenCalledWith(true);
  });

  it('ignores rail items that have no panel yet', () => {
    spyOn(component.expandedChange, 'emit');
    spyOn(component.selectedTabChange, 'emit');
    component.selectItem(component.railItems[2]);

    expect(component.expandedChange.emit).not.toHaveBeenCalled();
    expect(component.selectedTabChange.emit).not.toHaveBeenCalled();
  });

  describe('when a category is open in the data layers panel', () => {
    beforeEach(() => {
      selection$.next({ type: 'category', id: 20, name: 'Air Quality' });
      fixture.detectChanges();
    });

    it('shows the category name in the header', () => {
      expect(
        fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
          .textContent
      ).toContain('Air Quality');
    });

    it('goes back to the list from the header arrow', () => {
      fixture.debugElement
        .query(By.css('.panel-header .back-button'))
        .nativeElement.click();

      expect(dataLayersState.goBackToSearchResults).toHaveBeenCalled();
    });

    it('keeps the panel title on the base layers tab', () => {
      component.selectedTab = SidebarTabs.BASE_LAYERS;
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
          .textContent
      ).toContain('Base Layers');
      expect(
        fixture.debugElement.query(By.css('.panel-header .back-button'))
      ).toBeNull();
    });
  });
});
