import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentPlanTabsComponent } from './treatment-plan-tabs.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProjectAreasTabComponent } from '@treatments/project-areas-tab/project-areas-tab.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';

describe('TreatmentPlanTabsComponent', () => {
  let component: TreatmentPlanTabsComponent;
  let fixture: ComponentFixture<TreatmentPlanTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        TreatmentPlanTabsComponent,
        BrowserAnimationsModule,
      ],
      declarations: [
        MockDeclarations(
          ProjectAreasTabComponent,
          DataLayersComponent,
          BaseLayersComponent
        ),
      ],
      providers: [
        MockProvider(DataLayersStateService, {
          paths$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentPlanTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
