import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider, MockProviders } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectAreaTreatmentsTabComponent } from './treatments-tab.component';
import { TreatmentsState } from '../treatments.state';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { of } from 'rxjs';

describe('ProjectAreaTreatmentsTabComponent', () => {
  let component: ProjectAreaTreatmentsTabComponent;
  let fixture: ComponentFixture<ProjectAreaTreatmentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ProjectAreaTreatmentsTabComponent],
      providers: [
        MockProviders(MapConfigState, TreatmentsState, SelectedStandsState),
        MockProvider(TreatmentsState, {
          activeProjectArea$: of(undefined),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectAreaTreatmentsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
