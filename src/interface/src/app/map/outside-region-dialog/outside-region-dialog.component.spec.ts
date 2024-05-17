import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutsideRegionDialogComponent } from './outside-region-dialog.component';
import { ReactiveFormsModule } from '@angular/forms';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { DialogModule } from '@angular/cdk/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';

describe('OutsideRegionDialogComponent', () => {
  let component: OutsideRegionDialogComponent;
  let fixture: ComponentFixture<OutsideRegionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        LegacyMaterialModule,
        DialogModule,
        NoopAnimationsModule,
      ],
      declarations: [OutsideRegionDialogComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OutsideRegionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
