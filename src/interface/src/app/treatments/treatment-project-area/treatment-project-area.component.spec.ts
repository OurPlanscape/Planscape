import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';

describe('TreatmentProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TreatmentProjectAreaComponent,
        RouterTestingModule,
        BrowserAnimationsModule,
      ],
      providers: [
        MockProviders(MapConfigState, SelectedStandsState, TreatmentsState),
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
