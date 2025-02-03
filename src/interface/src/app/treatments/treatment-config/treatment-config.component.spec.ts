import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TreatmentConfigComponent } from './treatment-config.component';
import { MockDeclarations, MockProvider, MockProviders } from 'ng-mocks';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';
import { RouterTestingModule } from '@angular/router/testing';
import { TreatmentsService } from '@services/treatments.service';
import { NavBarComponent, SharedModule } from '@shared';
import { TreatmentNavbarMenuComponent } from '../treatment-navbar-menu/treatment-navbar-menu.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { of } from 'rxjs';

describe('TreatmentLayoutComponent', () => {
  let component: TreatmentConfigComponent;
  let fixture: ComponentFixture<TreatmentConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        BrowserAnimationsModule,
        TreatmentConfigComponent,
        RouterTestingModule,
        SharedModule,
      ],
      providers: [
        MockProviders(TreatmentsState, TreatmentsService),
        MockProvider(DirectImpactsStateService, {
          selectedProjectArea$: of('All' as any),
        }),
      ],
      declarations: [
        MockDeclarations(
          TreatmentMapComponent,
          NavBarComponent,
          TreatmentNavbarMenuComponent
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
