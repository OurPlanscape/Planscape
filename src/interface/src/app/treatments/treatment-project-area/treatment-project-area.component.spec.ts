import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentProjectAreaComponent } from './treatment-project-area.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { TreatmentsService } from '@services/treatments.service';

describe('ProjectAreaComponent', () => {
  let component: TreatmentProjectAreaComponent;
  let fixture: ComponentFixture<TreatmentProjectAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        TreatmentProjectAreaComponent,
        RouterTestingModule,
        TreatmentProjectAreaComponent,
      ],
      providers: [
        MockProviders(TreatedStandsState),
        MockProviders(TreatmentsService),
      ],
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
