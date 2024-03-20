import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatLegacyButtonHarness as MatButtonHarness } from '@angular/material/legacy-button/testing';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MaterialModule } from 'src/app/material/material.module';

import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;
  let fixture: ComponentFixture<ConfirmationDialogComponent>;
  let loader: HarnessLoader;
  const routerStub = () => ({ navigate: (_: string[]) => ({}) });
  const fakeDialog = () => ({ open: () => {} });
  const fakeDialogRef = () => ({ close: () => {} });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialModule, RouterTestingModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      declarations: [ConfirmationDialogComponent],
      providers: [
        { provide: Router, useFactory: routerStub },
        {
          provide: MatDialog,
          useFactory: fakeDialog,
        },
        {
          provide: MatDialogRef<ConfirmationDialogComponent>,
          useFactory: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationDialogComponent);
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
