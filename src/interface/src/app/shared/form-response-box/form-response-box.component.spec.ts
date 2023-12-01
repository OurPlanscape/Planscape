import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormResponseBoxComponent } from './form-response-box.component';

describe('FormResponseBoxComponent', () => {
  let component: FormResponseBoxComponent;
  let fixture: ComponentFixture<FormResponseBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FormResponseBoxComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormResponseBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
