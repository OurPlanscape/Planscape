import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentLayoutComponent } from './treatment-layout.component';
import { MockDeclarations } from 'ng-mocks';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('TreatmentLayoutComponent', () => {
  let component: TreatmentLayoutComponent;
  let fixture: ComponentFixture<TreatmentLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TreatmentLayoutComponent,
        HttpClientTestingModule,
        MatSnackBar,
        BrowserAnimationsModule,
      ],
      declarations: [MockDeclarations(TreatmentMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
