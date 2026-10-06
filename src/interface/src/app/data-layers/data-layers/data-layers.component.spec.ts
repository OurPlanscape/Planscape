import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayersComponent } from './data-layers.component';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { DataLayersStateService } from '../data-layers.state.service';
import { FeaturesModule } from '@features/features.module';
import { FeatureService } from '@features/feature.service';

describe('DataLayersComponent', () => {
  let component: DataLayersComponent;
  let fixture: ComponentFixture<DataLayersComponent>;

  async function setup(dataOrganization = false) {
    await TestBed.configureTestingModule({
      imports: [DataLayersComponent, FeaturesModule],
      providers: [
        MockProvider(DataLayersStateService, {
          searchTerm$: of(''),
          selectedDataSet$: of(null),
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
});
