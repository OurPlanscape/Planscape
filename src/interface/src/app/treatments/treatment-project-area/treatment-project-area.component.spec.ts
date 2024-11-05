import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentsService } from '@services/treatments.service';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { NotesSidebarComponent } from '@styleguide';

describe('TreatmentProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NotesSidebarComponent,
        TreatmentProjectAreaComponent,
        RouterTestingModule,
        HttpClientTestingModule,
        MatSnackBar,
        BrowserAnimationsModule,
      ],
      providers: [
        MockProviders(
          MapConfigState,
          SelectedStandsState,
          TreatmentsState,
          TreatmentsService
        ),
      ],
      declarations: [
        MockDeclarations(TreatmentMapComponent, MapBaseLayerComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentProjectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
