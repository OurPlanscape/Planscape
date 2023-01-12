import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetPrioritiesComponent } from './set-priorities.component';

describe('SetPrioritiesComponent', () => {
  let component: SetPrioritiesComponent;
  let fixture: ComponentFixture<SetPrioritiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SetPrioritiesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetPrioritiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
