import { Component, OnInit } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flushMicrotasks,
  TestBed,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { MapTabsComponent } from '@explore/map-tabs/map-tabs.component';
import { SidebarTabs } from '@explore/sidebar-tabs';
import { MockComponents } from 'ng-mocks';
import { ExploreSidebarComponent } from './explore-sidebar.component';
import { MultiMapConfigState } from '@maplibre-map/multi-map-config.state';
import { DataLayersRegistryService } from '@explore/data-layers-registry';
import {
  BrowseSelection,
  DataLayersStateService,
} from '@data-layers/data-layers.state.service';
import { BehaviorSubject, EMPTY, of } from 'rxjs';
import { WorkspaceState } from '@app/workspaces/workspace.state';
import { FEATURES_JSON } from '@features/features-config';
import { FeaturesModule } from '@features/features.module';

describe('ExploreSidebarComponent', () => {
  let component: ExploreSidebarComponent;
  let fixture: ComponentFixture<ExploreSidebarComponent>;
  let selection$: BehaviorSubject<BrowseSelection | null>;
  let dataLayersState: jasmine.SpyObj<DataLayersStateService>;
  let dataUploadEnabled = false;
  let workspacePermissions = ['view_workspace', 'add_datalayer'];

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
        {
          provide: WorkspaceState,
          useValue: {
            currentWorkspace$: of({ permissions: workspacePermissions }),
          },
        },
      ],
    })
      .overrideProvider(FEATURES_JSON, {
        useValue: { DATA_UPLOAD: dataUploadEnabled },
      })
      .overrideComponent(ExploreSidebarComponent, {
        remove: {
          imports: [MapTabsComponent, BaseLayersComponent, FeaturesModule],
        },
        add: {
          imports: [
            ...MockComponents(MapTabsComponent, BaseLayersComponent),
            FeaturesModule,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ExploreSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('shows the data layers panel by default', () => {
    expect(fixture.debugElement.query(By.css('app-map-tabs'))).toBeTruthy();
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
    expect(fixture.debugElement.query(By.css('app-map-tabs'))).toBeNull();
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

  it('stays open when the active rail item is picked again', () => {
    spyOn(component.expandedChange, 'emit');
    spyOn(component.selectedTabChange, 'emit');
    component.selectItem(component.railItems[0]);

    expect(component.expandedChange.emit).not.toHaveBeenCalled();
    expect(component.selectedTabChange.emit).not.toHaveBeenCalled();
  });

  it('expands when a rail item is picked while collapsed', () => {
    component.expanded = false;
    spyOn(component.expandedChange, 'emit');
    component.selectItem(component.railItems[0]);

    expect(component.expandedChange.emit).toHaveBeenCalledWith(true);
  });

  it('switches to the favorites panel when that rail item is picked', () => {
    spyOn(component.selectedTabChange, 'emit');
    component.selectItem(component.railItems[2]);

    expect(component.selectedTabChange.emit).toHaveBeenCalledWith(
      SidebarTabs.FAVORITES
    );
  });

  it('shows the favorites panel when that tab is selected', () => {
    component.selectedTab = SidebarTabs.FAVORITES;
    fixture.detectChanges();

    const panels = fixture.debugElement.queryAll(By.css('app-map-tabs'));

    expect(panels.length).toBe(1);
    expect(panels[0].attributes['panel']).toBe('favorites');
  });

  const railIcons = () =>
    fixture.debugElement
      .queryAll(By.css('.rail-button mat-icon'))
      .map((icon) => icon.nativeElement.textContent.trim());

  const uploadButton = () =>
    fixture.debugElement.query(By.css('.upload-button'));

  it('hides upload without DATA_UPLOAD', () => {
    expect(uploadButton()).toBeNull();
    expect(railIcons()).not.toContain('drive_folder_upload');
  });

  describe('with DATA_UPLOAD', () => {
    beforeAll(() => (dataUploadEnabled = true));
    afterAll(() => (dataUploadEnabled = false));

    it('shows the upload CTA at the top of the rail', () => {
      const rail: HTMLElement = fixture.nativeElement.querySelector(
        'app-sidebar-icon-rail'
      );
      expect(rail.firstElementChild).toBe(uploadButton().nativeElement);
    });

    describe('for a workspace viewer', () => {
      beforeAll(() => (workspacePermissions = ['view_workspace']));
      afterAll(
        () => (workspacePermissions = ['view_workspace', 'add_datalayer'])
      );

      it('hides the upload CTA', () => {
        expect(uploadButton()).toBeNull();
      });
    });

    it('shows the uploaded item', () => {
      expect(railIcons()).toEqual([
        'category',
        'layers',
        'drive_folder_upload',
        'star',
      ]);
    });

    it('switches to the uploaded panel when that rail item is picked', () => {
      spyOn(component.selectedTabChange, 'emit');
      fixture.debugElement
        .queryAll(By.css('.rail-button'))[2]
        .nativeElement.click();

      expect(component.selectedTabChange.emit).toHaveBeenCalledWith(
        SidebarTabs.UPLOADED
      );
    });

    it('titles the uploaded panel', () => {
      component.selectedTab = SidebarTabs.UPLOADED;
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
          .textContent
      ).toContain('Uploaded');
    });
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

// Stands in for a synced map: registers its data layers state and restores
// the stored selection on init, after the sidebar header has been checked.
@Component({
  selector: 'app-restoring-map',
  standalone: true,
  template: '',
})
class RestoringMapComponent implements OnInit {
  constructor(private registry: DataLayersRegistryService) {}

  ngOnInit() {
    const selection$ = new BehaviorSubject<BrowseSelection | null>(null);
    this.registry.set(1, { selection$ } as unknown as DataLayersStateService);
    selection$.next({ type: 'category', id: 5, name: 'Fire-Adapted' });
  }
}

@Component({
  selector: 'app-restoring-maps',
  standalone: true,
  imports: [RestoringMapComponent],
  template: '<app-restoring-map></app-restoring-map>',
})
class RestoringMapsComponent {}

@Component({
  standalone: true,
  imports: [ExploreSidebarComponent, RestoringMapsComponent],
  template: `
    <app-explore-sidebar></app-explore-sidebar>
    <app-restoring-maps></app-restoring-maps>
  `,
})
class ExploreHostComponent {}

describe('ExploreSidebarComponent with a map restored after it', () => {
  let fixture: ComponentFixture<ExploreHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreHostComponent],
      providers: [
        {
          provide: MultiMapConfigState,
          useValue: { selectedMapId$: new BehaviorSubject(1) },
        },
        { provide: WorkspaceState, useValue: { currentWorkspace$: EMPTY } },
      ],
    })
      .overrideComponent(ExploreSidebarComponent, {
        remove: { imports: [MapTabsComponent, BaseLayersComponent] },
        add: {
          imports: MockComponents(MapTabsComponent, BaseLayersComponent),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ExploreHostComponent);
  });

  it('shows the restored category without changing the header mid-check', fakeAsync(() => {
    expect(() => fixture.detectChanges()).not.toThrow();

    flushMicrotasks();
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
        .textContent
    ).toContain('Fire-Adapted');
  }));
});
