import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingDialogComponent } from './pending-dialog.component';

describe('PendingDialogComponent', () => {
  let component: PendingDialogComponent;
  let fixture: ComponentFixture<PendingDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PendingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
