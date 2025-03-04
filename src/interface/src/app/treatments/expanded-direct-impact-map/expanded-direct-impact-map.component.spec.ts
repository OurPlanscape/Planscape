import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedDirectImpactMapComponent } from './expanded-direct-impact-map.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { MatDialogRef } from '@angular/material/dialog';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { of } from 'rxjs';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';

describe('ExpandedDirectImpactMapComponent', () => {
  let component: ExpandedDirectImpactMapComponent;
  let fixture: ComponentFixture<ExpandedDirectImpactMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandedDirectImpactMapComponent],
      providers: [
        MockProvider(TreatedStandsState, {
          treatmentActionsUsed$: of([]),
        }),
        MockProvider(MapConfigState),
        { provide: MatDialogRef, useValue: {} },
      ],
      declarations: [
        MockDeclarations(DirectImpactsMapComponent, TreatmentLegendComponent),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpandedDirectImpactMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
