import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormMessageBoxComponent } from '@shared/form-message-box/form-message-box.component';

describe('FormMessageBoxComponent', () => {
  let component: FormMessageBoxComponent;
  let fixture: ComponentFixture<FormMessageBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FormMessageBoxComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FormMessageBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
