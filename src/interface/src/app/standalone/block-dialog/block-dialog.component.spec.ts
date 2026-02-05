import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockDialogComponent } from './block-dialog.component';
import { ModalComponent } from '@styleguide';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

describe('BlockDialogComponent', () => {
  let component: BlockDialogComponent;
  let fixture: ComponentFixture<BlockDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockDialogComponent, ModalComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { data: { body: 'the body', title: 'the title' } },
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlockDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
