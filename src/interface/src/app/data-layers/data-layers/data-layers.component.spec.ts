import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject, of } from 'rxjs';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { FeaturesModule } from '@app/features/features.module';

describe('DataLayersComponent', () => {
  let component: DataLayersComponent;
  let fixture: ComponentFixture<DataLayersComponent>;

  beforeEach(async () => {
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
    }).compileComponents();

    fixture = TestBed.createComponent(DataLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
