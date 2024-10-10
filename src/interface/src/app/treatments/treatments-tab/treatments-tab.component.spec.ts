import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProviders } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectAreaTreatmentsTabComponent } from './treatments-tab.component';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { TreatmentsState } from '../treatments.state';

describe('ProjectAreaTreatmentsTabComponent', () => {
  let component: ProjectAreaTreatmentsTabComponent;
  let fixture: ComponentFixture<ProjectAreaTreatmentsTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ProjectAreaTreatmentsTabComponent],
      providers: [
        MockProviders(TreatedStandsState),
        MockProviders(TreatmentsState),
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
