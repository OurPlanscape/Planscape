import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteRunModalComponent } from './delete-run-modal.component';

describe('DeleteRunModalComponent', () => {
  let component: DeleteRunModalComponent;
  let fixture: ComponentFixture<DeleteRunModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteRunModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteRunModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
