import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldAlertComponent } from '@shared/field-alert/field-alert.component';

describe('FieldAlertComponent', () => {
  let component: FieldAlertComponent;
  let fixture: ComponentFixture<FieldAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FieldAlertComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FieldAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
