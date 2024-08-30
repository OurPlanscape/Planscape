import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpanderSectionComponent } from './expander-section.component';

describe('ExpanderSectionComponent', () => {
  let component: ExpanderSectionComponent;
  let fixture: ComponentFixture<ExpanderSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpanderSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpanderSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
