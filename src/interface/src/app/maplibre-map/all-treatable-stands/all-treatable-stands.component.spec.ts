import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllTreatableStandsComponent } from './all-treatable-stands.component';
import { ActivatedRoute } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { MapService } from '@maplibre/ngx-maplibre-gl';

describe('AllTreatableStandsComponent', () => {
  let component: AllTreatableStandsComponent;
  let fixture: ComponentFixture<AllTreatableStandsComponent>;
  const mockRouteSnapshotData: { planId?: number; scenarioId?: number } = {
    planId: 100,
    scenarioId: 120,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllTreatableStandsComponent],
      providers: [
        MapService,
        MockProvider(ActivatedRoute, {
          snapshot: { data: mockRouteSnapshotData } as any,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AllTreatableStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
