import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanningAreaCreationModalComponent } from './planning-area-creation-modal.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { PlanService } from '@app/services';
import {
  FileUploadFieldComponent,
  InputFieldComponent,
  ModalComponent,
  ModalInfoComponent,
} from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('PlanningAreaCreationModalComponent', () => {
  let component: PlanningAreaCreationModalComponent;
  let fixture: ComponentFixture<PlanningAreaCreationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningAreaCreationModalComponent],
      declarations: [
        MockDeclarations(
          ModalComponent,
          ModalInfoComponent,
          InputFieldComponent,
          FileUploadFieldComponent
        ),
      ],
      providers: [
        MockProvider(PlanService),
        MockProvider(MatSnackBar),
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: {} } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaCreationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
