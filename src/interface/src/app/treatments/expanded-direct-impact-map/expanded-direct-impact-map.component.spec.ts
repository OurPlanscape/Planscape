import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedDirectImpactMapComponent } from '@app/treatments/expanded-direct-impact-map/expanded-direct-impact-map.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { MatDialogRef } from '@angular/material/dialog';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { TreatedStandsState } from '@app/treatments/treatment-map/treated-stands.state';
import { of } from 'rxjs';
import { DirectImpactsMapComponent } from '@app/treatments/direct-impacts-map/direct-impacts-map.component';
import { TreatmentLegendComponent } from '@app/treatments/treatment-legend/treatment-legend.component';

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
