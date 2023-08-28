import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';

import { SignInDialogComponent } from './sign-in-dialog.component';

describe('SignInCardComponent', () => {
  let component: SignInDialogComponent;
  let fixture: ComponentFixture<SignInDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SignInDialogComponent],
      providers: [{ provide: MatDialogRef, useValue: {} }],
    }).compileComponents();

    fixture = TestBed.createComponent(SignInDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
