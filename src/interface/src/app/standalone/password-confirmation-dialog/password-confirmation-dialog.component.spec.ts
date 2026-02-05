import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { PasswordConfirmationDialogComponent } from '@app/standalone/password-confirmation-dialog/password-confirmation-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatButtonHarness } from '@angular/material/button/testing';

describe('ConfirmationDialogComponent', () => {
  let component: PasswordConfirmationDialogComponent;
  let fixture: ComponentFixture<PasswordConfirmationDialogComponent>;
  let loader: HarnessLoader;
  const routerStub = () => ({ navigate: (_: string[]) => ({}) });
  const fakeDialog = () => ({
    open: () => {},
  });
  const fakeDialogRef = () => ({
    close: () => {},
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, PasswordConfirmationDialogComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],

      providers: [
        { provide: Router, useFactory: routerStub },
        {
          provide: MatDialog,
          useFactory: fakeDialog,
        },
        {
          provide: MatDialogRef<PasswordConfirmationDialogComponent>,
          useFactory: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordConfirmationDialogComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('OK button should close dialog', async () => {
    const router = fixture.debugElement.injector.get(Router);
    spyOn(router, 'navigate').and.callThrough();

    const dialogRef = fixture.debugElement.injector.get(MatDialogRef);
    spyOn(dialogRef, 'close').and.callThrough();
    const okButton: MatButtonHarness = await loader.getHarness(
      MatButtonHarness.with({ text: /OK/ })
    );

    await okButton.click();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledOnceWith(['login']);
  });
});
