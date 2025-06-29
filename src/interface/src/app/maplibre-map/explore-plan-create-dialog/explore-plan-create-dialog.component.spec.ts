import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExplorePlanCreateDialogComponent } from './explore-plan-create-dialog.component';

describe('ExplorePlanCreateDialogComponent', () => {
  let component: ExplorePlanCreateDialogComponent;
  let fixture: ComponentFixture<ExplorePlanCreateDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExplorePlanCreateDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorePlanCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
