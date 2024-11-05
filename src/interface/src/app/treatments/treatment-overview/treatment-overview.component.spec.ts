import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentOverviewComponent } from './treatment-overview.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsState } from '../treatments.state';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigState } from '../treatment-map/map-config.state';

describe('TreatmentOverviewComponent', () => {
  let component: TreatmentOverviewComponent;
  let fixture: ComponentFixture<TreatmentOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        TreatmentOverviewComponent,
        RouterTestingModule,
        BrowserAnimationsModule,
      ],
      declarations: [
        MockDeclarations(ProjectAreasTabComponent, MapBaseLayerComponent),
      ],
      providers: [MockProviders(MapConfigState, TreatmentsState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
