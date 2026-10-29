import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayersComponent } from './data-layers.component';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import {
  BrowseSelection,
  DataLayersStateService,
} from '../data-layers.state.service';
import { FeaturesModule } from '@features/features.module';
import { FeatureService } from '@features/feature.service';

describe('DataLayersComponent', () => {
  let component: DataLayersComponent;
  let fixture: ComponentFixture<DataLayersComponent>;

  let selection$: BehaviorSubject<BrowseSelection | null>;
  let loadError$: BehaviorSubject<boolean>;

  async function setup(dataOrganization = false) {
    selection$ = new BehaviorSubject<BrowseSelection | null>(null);
    loadError$ = new BehaviorSubject(false);
    await TestBed.configureTestingModule({
      imports: [DataLayersComponent, FeaturesModule],
      providers: [
        MockProvider(DataLayersStateService, {
          searchTerm$: of(''),
          selection$: selection$,
          isBrowsing$: of(true),
          dataTree$: of(null),
          searchResults$: of(null),
          loading$: new BehaviorSubject(false),
          loadError$,
        }),
      ],
    })
      .overrideProvider(FeatureService, {
        useValue: { isFeatureEnabled: () => dataOrganization },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DataLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it('shows the clear button with DATA_ORGANIZATION off', async () => {
    await setup(false);
    expect(component.showClearButton).toBeTrue();
  });

  it('moves the clear button to the map with DATA_ORGANIZATION on', async () => {
    await setup(true);
    expect(component.showClearButton).toBeFalse();
  });

  it('keeps the old search hint with DATA_ORGANIZATION off', async () => {
    await setup(false);
    expect(component.searchPlaceholder).toBe(
      'Search by dataset, metric, category, org...'
    );
  });

  it('searches "in data layers" with DATA_ORGANIZATION on', async () => {
    await setup(true);
    expect(component.searchPlaceholder).toBe('Search in data layers');
  });

  describe('when the map module fails to load', () => {
    beforeEach(async () => {
      await setup();
      loadError$.next(true);
      fixture.detectChanges();
    });

    it('replaces the search and list with an error', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('sg-search-bar')).toBeNull();
      expect(el.querySelector('.scrollable')).toBeNull();
      expect(el.querySelector('sg-message-card')?.textContent).toContain(
        "We couldn't load data layers"
      );
    });

    it('retries the load', () => {
      const state = TestBed.inject(DataLayersStateService);
      spyOn(state, 'retryLoad');
      fixture.nativeElement.querySelector('sg-message-card button').click();
      expect(state.retryLoad).toHaveBeenCalled();
    });

    it('shows the panel again once the load succeeds', () => {
      loadError$.next(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('sg-search-bar')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('sg-message-card')).toBeNull();
    });
  });

  describe('selection header', () => {
    beforeEach(async () => {
      await setup();
      selection$.next({ type: 'category', id: 20, name: 'Air Quality' });
      fixture.detectChanges();
    });

    it('shows the back link to the list by default', () => {
      const header = fixture.nativeElement.querySelector('.data-set.sticky');
      expect(header?.textContent).toContain('Air Quality');
    });

    it('hides it when the host renders the navigation', () => {
      fixture.componentRef.setInput('showSelectionHeader', false);
      fixture.detectChanges();
      expect(
        fixture.nativeElement.querySelector('.data-set.sticky')
      ).toBeNull();
    });
  });
});
