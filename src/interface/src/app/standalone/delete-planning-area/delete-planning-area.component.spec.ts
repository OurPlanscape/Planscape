import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeletePlanningAreaComponent } from './delete-planning-area.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

describe('DeletePlanningAreaComponent', () => {
  let component: DeletePlanningAreaComponent;
  let fixture: ComponentFixture<DeletePlanningAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeletePlanningAreaComponent, MatDialogModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: MatDialogRef<DeletePlanningAreaComponent>,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { data: { name: 'Some Planning Area Name' } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeletePlanningAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
