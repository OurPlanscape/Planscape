import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpandedStandDataChartComponent } from './expanded-stand-data-chart.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ExpandedStandDataChartComponent', () => {
  let component: ExpandedStandDataChartComponent;
  let fixture: ComponentFixture<ExpandedStandDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpandedStandDataChartComponent, NoopAnimationsModule],
      providers: [
        MockProvider(DirectImpactsStateService, {
          activeStand$: new BehaviorSubject(null),
        }),
        { provide: MatDialogRef, useValue: {} },
      ],
      declarations: [MockDeclaration(StandDataChartComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpandedStandDataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
