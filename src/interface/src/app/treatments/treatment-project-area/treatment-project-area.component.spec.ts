import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { RouterTestingModule } from '@angular/router/testing';

import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

describe('ProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentProjectAreaComponent, RouterTestingModule],
      providers: [MockProviders(TreatedStandsState)],
      declarations: [MockDeclarations(TreatmentMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentProjectAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
