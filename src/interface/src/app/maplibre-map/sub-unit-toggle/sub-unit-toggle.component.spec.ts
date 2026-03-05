import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubUnitToggleComponent } from './sub-unit-toggle.component';

describe('SubUnitToggleComponent', () => {
  let component: SubUnitToggleComponent;
  let fixture: ComponentFixture<SubUnitToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubUnitToggleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubUnitToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
