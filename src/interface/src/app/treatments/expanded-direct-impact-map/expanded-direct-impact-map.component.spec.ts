import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpandedDirectImpactMapComponent } from './expanded-direct-impact-map.component';
import { MockProvider } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { BehaviorSubject } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { MapConfigState } from '../treatment-map/map-config.state';

describe('ExpandedDirectImpactMapComponent', () => {
  let component: ExpandedDirectImpactMapComponent;
  let fixture: ComponentFixture<ExpandedDirectImpactMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandedDirectImpactMapComponent],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeStand$: new BehaviorSubject(null),
        }),
        MockProvider(MapConfigState),
        { provide: MatDialogRef, useValue: {} },
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
