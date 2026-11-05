import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { MockComponent } from 'ng-mocks';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { FavoriteDataLayersComponent } from '@data-layers/favorite-data-layers/favorite-data-layers.component';
import {
  BrowseSelection,
  DataLayersStateService,
} from '../data-layers.state.service';
import { DataLayersRailComponent } from './data-layers-rail.component';
import { FEATURES_JSON } from '@features/features-config';
import { FeaturesModule } from '@features/features.module';

describe('DataLayersRailComponent', () => {
  let fixture: ComponentFixture<DataLayersRailComponent>;
  let selection$: BehaviorSubject<BrowseSelection | null>;
  let paths$: BehaviorSubject<string[]>;
  let state: jasmine.SpyObj<DataLayersStateService>;
  let dataUploadEnabled = false;

  beforeEach(async () => {
    selection$ = new BehaviorSubject<BrowseSelection | null>(null);
    paths$ = new BehaviorSubject<string[]>([]);
    state = jasmine.createSpyObj<DataLayersStateService>(
      'DataLayersStateService',
      ['goBackToSearchResults'],
      { selection$, paths$ }
    );

    await TestBed.configureTestingModule({
      imports: [DataLayersRailComponent],
      providers: [{ provide: DataLayersStateService, useValue: state }],
    })
      .overrideProvider(FEATURES_JSON, {
        useValue: { DATA_UPLOAD: dataUploadEnabled },
      })
      .overrideComponent(DataLayersRailComponent, {
        remove: {
          imports: [
            DataLayersComponent,
            BaseLayersComponent,
            FavoriteDataLayersComponent,
            FeaturesModule,
          ],
        },
        add: {
          imports: [
            MockComponent(DataLayersComponent),
            MockComponent(BaseLayersComponent),
            MockComponent(FavoriteDataLayersComponent),
            FeaturesModule,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DataLayersRailComponent);
    fixture.componentRef.setInput('displayAddButton', true);
    fixture.componentRef.setInput('stickySearch', true);
    fixture.detectChanges();
  });

  const title = () =>
    fixture.debugElement.query(By.css('.panel-header h4')).nativeElement
      .textContent;

  const buttons = () => fixture.debugElement.queryAll(By.css('.rail-button'));

  it('shows the rail with data layers and favorites selectable', () => {
    expect(buttons().length).toBe(2);
    expect(buttons()[0].nativeElement.classList).toContain('active');
    expect(
      buttons().some((b) => b.nativeElement.classList.contains('disabled'))
    ).toBeFalse();
  });

  it('switches the panel to favorites', () => {
    buttons()[1].nativeElement.click();
    fixture.detectChanges();

    expect(title()).toContain('Favorite Data Layers');
    expect(
      fixture.debugElement.query(By.css('app-favorite-data-layers'))
    ).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-data-layers'))).toBeNull();
  });

  it('titles the panel "Data Layers" while browsing the list', () => {
    expect(title()).toContain('Data Layers');
    expect(fixture.debugElement.query(By.css('.back-button'))).toBeNull();
  });

  it('shows the open category with a way back', () => {
    selection$.next({ type: 'category', id: 20, name: 'Air Quality' });
    fixture.detectChanges();

    expect(title()).toContain('Air Quality');
    fixture.debugElement.query(By.css('.back-button')).nativeElement.click();
    expect(state.goBackToSearchResults).toHaveBeenCalled();
  });

  it('passes its options to the data layers, minus the in-list header', () => {
    const layers = fixture.debugElement.query(By.css('app-data-layers'));
    const instance = layers.componentInstance as DataLayersComponent;

    expect(instance.displayAddButton).toBeTrue();
    expect(instance.showSelectionHeader).toBeFalse();
    expect(layers.nativeElement.classList).toContain('sticky-search');
  });

  const icons = () =>
    fixture.debugElement
      .queryAll(By.css('.rail-button mat-icon'))
      .map((i) => i.nativeElement.textContent.trim());

  it('hides the uploaded item without DATA_UPLOAD', () => {
    expect(icons()).not.toContain('drive_folder_upload');
  });

  describe('with DATA_UPLOAD', () => {
    beforeAll(() => (dataUploadEnabled = true));
    afterAll(() => (dataUploadEnabled = false));

    it('shows the uploaded item, still disabled', () => {
      expect(icons()).toEqual(['category', 'drive_folder_upload', 'star']);
      expect(buttons()[1].nativeElement.classList).toContain('disabled');
    });
  });

  describe('with base layers', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('showBaseLayers', true);
      fixture.detectChanges();
    });

    it('adds base layers to the rail after data layers', () => {
      expect(buttons().length).toBe(3);
      expect(buttons()[1].nativeElement.classList).not.toContain('disabled');
    });

    it('switches the panel to base layers', () => {
      buttons()[1].nativeElement.click();
      fixture.detectChanges();

      expect(title()).toContain('Base Layers');
      expect(
        fixture.debugElement.query(By.css('app-base-layers'))
      ).toBeTruthy();
      expect(fixture.debugElement.query(By.css('app-data-layers'))).toBeNull();
    });

    it('goes back to data layers when a layer is browsed to from the map', () => {
      buttons()[1].nativeElement.click();
      fixture.detectChanges();

      paths$.next(['Fire Dynamics']);
      fixture.detectChanges();

      expect(
        fixture.debugElement.query(By.css('app-data-layers'))
      ).toBeTruthy();
      expect(fixture.debugElement.query(By.css('app-base-layers'))).toBeNull();
    });
  });
});
