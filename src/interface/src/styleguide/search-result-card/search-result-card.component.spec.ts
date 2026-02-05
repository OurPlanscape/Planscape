import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SearchResultCardComponent } from './search-result-card.component';
import { PRESCRIPTIONS } from '@treatments/prescriptions';
import { TreatmentProjectArea } from '@types';

describe('SearchResultCardComponent', () => {
  let component: SearchResultCardComponent;
  let fixture: ComponentFixture<SearchResultCardComponent>;

  const projectArea: TreatmentProjectArea = {
    project_area_id: 1,
    project_area_name: 'Sample Project',
    total_area_acres: 100,
    total_stand_count: 10,
    total_treated_area_acres: 12,
    total_treated_stand_count: 3,
    prescriptions: [
      {
        action: 'RX_FIRE',
        area_acres: 10,
        treated_stand_count: 1,
        type: 'SINGLE',
        stand_ids: [],
      },
      {
        action: 'HEAVY_THINNING_BURN_PLUS_RX_FIRE',
        area_acres: 20,
        treated_stand_count: 2,
        type: 'SEQUENCE',
        stand_ids: [],
      },
    ],
    extent: [0, 0, 0, 0],
    centroid: {
      type: 'Point',
      coordinates: [],
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchResultCardComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchResultCardComponent);
    component = fixture.componentInstance;
    component.projectArea = projectArea;
    component.searchString = 'fire';
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('extracts the project title', () => {
    expect(component.extractProjectTitle()).toBe('Sample Project');
  });

  it('emits on card click', () => {
    fixture.detectChanges();
    const emitSpy = spyOn(component.cardClick, 'emit');

    const card = fixture.nativeElement.querySelector('div');
    card.click();

    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('identifies single and sequence prescriptions', () => {
    const singleRx = projectArea.prescriptions[0];
    const sequenceRx = projectArea.prescriptions[1];

    expect(component.treatmentIsSingle(singleRx)).toBeTrue();
    expect(component.treatmentIsSingle(sequenceRx)).toBeFalse();
  });

  it('returns text and matches for single prescriptions', () => {
    const singleRx = projectArea.prescriptions[0];

    const singleAction = singleRx.action as keyof typeof PRESCRIPTIONS.SINGLE;
    expect(component.singleRxText(singleRx)).toBe(
      PRESCRIPTIONS.SINGLE[singleAction]
    );
    expect(component.singleRxMatches(singleRx)).toBeTrue();

    component.searchString = 'mastica';
    expect(component.singleRxMatches(singleRx)).toBeFalse();
  });

  it('returns sequence attributes and matches descriptions', () => {
    const sequenceRx = projectArea.prescriptions[1];
    const attributes = component.sequenceRxAttributes(sequenceRx);

    expect(attributes.length).toBeGreaterThan(0);
    expect(attributes[0].description).toContain('Thin');

    component.searchString = 'burn';
    expect(
      component.sequenceDescriptionMatches(attributes[0].description)
    ).toBeTrue();

    component.searchString = 'masticate';
    expect(
      component.sequenceDescriptionMatches(attributes[0].description)
    ).toBeFalse();
  });
});
