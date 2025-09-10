import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTreatmentDialogComponent } from './create-treatment-dialog.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { LegacyMaterialModule } from 'src/app/material/legacy-material.module';
import { MockProvider } from 'ng-mocks';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('CreateTreatmentDialogComponent', () => {
  let component: CreateTreatmentDialogComponent;
  let fixture: ComponentFixture<CreateTreatmentDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CreateTreatmentDialogComponent,
        CommonModule,
        ReactiveFormsModule,
        LegacyMaterialModule,
        BrowserAnimationsModule,
      ],
      providers: [MockProvider(MatDialogRef)],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateTreatmentDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
