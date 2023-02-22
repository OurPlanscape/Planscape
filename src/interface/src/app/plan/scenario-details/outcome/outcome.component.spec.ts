import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutcomeComponent } from './outcome.component';

describe('OutcomeComponent', () => {
  let component: OutcomeComponent;
  let fixture: ComponentFixture<OutcomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OutcomeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
