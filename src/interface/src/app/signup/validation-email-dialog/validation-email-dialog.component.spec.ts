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

import { ValidationEmailDialog } from './validation-email-dialog.component';

describe('ValidationEmailDialogComponent', () => {
  let component: ValidationEmailDialog;
  let fixture: ComponentFixture<ValidationEmailDialog>;
  let loader: HarnessLoader;
  let fakeAuthService: AuthService;

  beforeEach(async () => {
    fakeAuthService = jasmine.createSpyObj(
      'AuthService',
      {
        deleteUser: of(true),
      },
      {}
    );
    const fakeData = {
      user: {
        email: 'test@test.com',
      },
    };
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
      imports: [MaterialModule],
      declarations: [ValidationEmailDialog],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: fakeData,
        },
        {
          provide: MatDialog,
          useValue: fakeDialog,
        },
        {
          provide: MatDialogRef<ValidationEmailDialog>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationEmailDialog);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('OK button should close dialog', async () => {
    const dialogRef = fixture.debugElement.injector.get(MatDialogRef);
    const cancelButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /CANCEL/ })
    );

    await cancelButton.click();

    expect(dialogRef.close).toHaveBeenCalledOnceWith();
  });

  it('resubmit link should invoke the email service again', async () => {
    const dialogRef = fixture.debugElement.injector.get(MatDialogRef);
    const deleteButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /DELETE/ })
    );

    await deleteButton.click();

    expect(fakeAuthService.deleteUser).toHaveBeenCalledOnceWith({
      email: 'test@test.com',
    });
    expect(dialogRef.close).toHaveBeenCalledOnceWith({ deletedAccount: true });
  });
});
