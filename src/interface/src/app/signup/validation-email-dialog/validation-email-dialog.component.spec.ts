import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { AuthService } from 'src/app/services';

import { ValidationEmailDialogComponent } from './validation-email-dialog.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

describe('ValidationEmailDialogComponent', () => {
  let component: ValidationEmailDialogComponent;
  let fixture: ComponentFixture<ValidationEmailDialogComponent>;
  let loader: HarnessLoader;
  let fakeAuthService: AuthService;

  beforeEach(async () => {
    fakeAuthService = jasmine.createSpyObj(
      'AuthService',
      {
        resendValidationEmail: of(true),
      },
      {}
    );
    const fakeDialog = jasmine.createSpyObj(
      'MatDialog',
      {
        open: undefined,
      },
      {}
    );
    const fakeDialogRef = jasmine.createSpyObj(
      'MatDialogRef',
      {
        close: undefined,
      },
      {}
    );
    await TestBed.configureTestingModule({
      imports: [MaterialModule, RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ValidationEmailDialogComponent],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: 'test@test.com',
        },
        {
          provide: MatDialog,
          useValue: fakeDialog,
        },
        {
          provide: MatDialogRef<ValidationEmailDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationEmailDialogComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('OK button should close dialog', async () => {
    const dialogRef = fixture.debugElement.injector.get(MatDialogRef);
    const okButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /OK/ })
    );

    await okButton.click();

    expect(dialogRef.close).toHaveBeenCalledOnceWith();
  });

  it('resubmit link should invoke the email service again', async () => {
    component.resendEmail();
    expect(fakeAuthService.resendValidationEmail).toHaveBeenCalledOnceWith(
      'test@test.com'
    );
  });
});
