import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentPrescriptionComponent } from './treatment-prescription.component';
import { PRESCRIPTIONS } from '../../app/treatments/prescriptions';

describe('TreatmentPrescriptionComponent', () => {
  let component: TreatmentPrescriptionComponent;
  let fixture: ComponentFixture<TreatmentPrescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentPrescriptionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPrescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses explicit title when provided', () => {
    component.title = 'Custom Title';
    component.treatmentType = 'SINGLE';
    component.action = 'RX_FIRE';

    expect(component.singleRxTitleText()).toBe('Custom Title');
  });

  it('derives title for single prescriptions', () => {
    component.title = null;
    component.treatmentType = 'SINGLE';
    component.action = 'RX_FIRE';

    expect(component.singleRxTitleText()).toBe(PRESCRIPTIONS.SINGLE.RX_FIRE);
  });

  it('derives title for sequence prescriptions', () => {
    component.title = null;
    component.treatmentType = 'SEQUENCE';
    component.action = 'HEAVY_THINNING_BURN_PLUS_RX_FIRE';

    const expected =
      PRESCRIPTIONS.SEQUENCE.HEAVY_THINNING_BURN_PLUS_RX_FIRE.map(
        (d) => d.description
      ).join(' ');

    expect(component.singleRxTitleText()).toBe(expected);
  });

  it('returns sequence titles for sequence actions', () => {
    component.action = 'HEAVY_THINNING_BURN_PLUS_RX_FIRE';

    const titles = component.sequenceTitles();

    expect(titles.length).toBeGreaterThan(0);
    expect(titles[0].description).toContain('Thin');
  });

  it('returns the icon action when available', () => {
    component.action = 'RX_FIRE';

    expect(component.treatmentIconType()).toBe('RX_FIRE');
  });

  it('renders percentage when area is provided', () => {
    component.treatmentType = 'SINGLE';
    component.action = 'RX_FIRE';
    component.areaAcres = 25;
    component.projectAreaTotalAcres = 100;
    fixture.detectChanges();

    const percentEl = fixture.nativeElement.querySelector('.percent');
    expect(percentEl.textContent).toContain('25%');
  });
});
