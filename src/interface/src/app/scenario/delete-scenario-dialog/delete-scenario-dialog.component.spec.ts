import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteScenarioDialogComponent } from './delete-scenario-dialog.component';

describe('DeleteScenarioDialogComponent', () => {
  let component: DeleteScenarioDialogComponent;
  let fixture: ComponentFixture<DeleteScenarioDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteScenarioDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteScenarioDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
