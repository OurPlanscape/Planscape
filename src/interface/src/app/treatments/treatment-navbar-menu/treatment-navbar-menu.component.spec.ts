import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatmentNavbarMenuComponent } from './treatment-navbar-menu.component';
import { MockProviders } from 'ng-mocks';
import { TreatmentsState } from '../treatments.state';
import { TreatmentsService } from '@services/treatments.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('TreatmentNavbarMenuComponent', () => {
  let component: TreatmentNavbarMenuComponent;
  let fixture: ComponentFixture<TreatmentNavbarMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatmentNavbarMenuComponent],
      providers: [
        MockProviders(
          TreatmentsState,
          TreatmentsService,
          MatDialog,
          MatSnackBar
        ),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatmentNavbarMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
