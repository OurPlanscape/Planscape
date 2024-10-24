import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentMapComponent } from './treatment-map.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { MapConfigState } from './map-config.state';
import { TreatedStandsState } from './treated-stands.state';
import { MapStandsComponent } from '../map-stands/map-stands.component';
import { MapRectangleComponent } from '../map-rectangle/map-rectangle.component';
import { MapProjectAreasComponent } from '../map-project-areas/map-project-areas.component';
import { SelectedStandsState } from './selected-stands.state';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';

import { AuthService } from '@services';

import { TreatmentsState } from '../treatments.state';

describe('TreatmentMapComponent', () => {
  let component: TreatmentMapComponent;
  let fixture: ComponentFixture<TreatmentMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentMapComponent, CommonModule],
      providers: [
        MockProviders(
          TreatedStandsState,
          SelectedStandsState,
          AuthService,
          TreatmentsState
        ),
        MockProvider(MapConfigState, { cursor$: of('') }),
      ],
      declarations: [
        MockDeclarations(
          MapStandsComponent,
          MapRectangleComponent,
          MapProjectAreasComponent
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
