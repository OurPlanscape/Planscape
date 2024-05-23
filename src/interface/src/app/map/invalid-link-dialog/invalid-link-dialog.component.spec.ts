import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvalidLinkDialogComponent } from './invalid-link-dialog.component';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { LegacyMaterialModule } from '../../material/legacy-material.module';

describe('InvalidLinkDialogComponent', () => {
  let component: InvalidLinkDialogComponent;
  let fixture: ComponentFixture<InvalidLinkDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InvalidLinkDialogComponent],
      imports: [LegacyMaterialModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InvalidLinkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
