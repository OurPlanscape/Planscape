import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentPlanTabsComponent } from './treatment-plan-tabs.component';
import { TreatmentsState } from '../treatments.state';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TreatmentPlanAboutTabComponent } from '../treatment-plan-about-tab/treatment-plan-about-tab.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';

describe('TreatmentPlanTabsComponent', () => {
  let component: TreatmentPlanTabsComponent;
  let fixture: ComponentFixture<TreatmentPlanTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        TreatmentPlanTabsComponent,
        BrowserAnimationsModule,
      ],
      declarations: [
        MockDeclarations(
          TreatmentPlanAboutTabComponent,
          ProjectAreasTabComponent
        ),
      ],
      providers: [MockProviders(TreatmentsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
