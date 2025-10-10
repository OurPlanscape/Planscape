import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteScenarioDialogComponent } from './delete-scenario-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';

describe('DeleteScenarioDialogComponent', () => {
  let component: DeleteScenarioDialogComponent;
  let fixture: ComponentFixture<DeleteScenarioDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteScenarioDialogComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteScenarioDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
