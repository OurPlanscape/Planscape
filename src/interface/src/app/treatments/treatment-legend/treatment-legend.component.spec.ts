import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentLegendComponent } from './treatment-legend.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from '../treatment-map/map-config.state';

describe('TreatmentLegendComponent', () => {
  let component: TreatmentLegendComponent;
  let fixture: ComponentFixture<TreatmentLegendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentLegendComponent, BrowserAnimationsModule],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentLegendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
