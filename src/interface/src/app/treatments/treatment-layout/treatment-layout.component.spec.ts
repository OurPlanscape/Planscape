import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentLayoutComponent } from './treatment-layout.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsService } from '@services/treatments.service';
import { NavBarComponent, SharedModule } from '@shared';
import { TreatmentNavbarMenuComponent } from '../treatment-navbar-menu/treatment-navbar-menu.component';

describe('TreatmentLayoutComponent', () => {
  let component: TreatmentLayoutComponent;
  let fixture: ComponentFixture<TreatmentLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentLayoutComponent, RouterTestingModule, SharedModule],
      providers: [MockProviders(TreatmentsState, TreatmentsService)],
      declarations: [
        MockDeclarations(
          TreatmentMapComponent,
          NavBarComponent,
          TreatmentNavbarMenuComponent
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
