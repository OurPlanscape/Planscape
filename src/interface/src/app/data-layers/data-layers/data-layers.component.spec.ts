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

  async function setup(dataOrganization = false) {
    selection$ = new BehaviorSubject<BrowseSelection | null>(null);
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
