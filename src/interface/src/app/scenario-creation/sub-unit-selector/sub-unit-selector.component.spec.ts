import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubUnitSelectorComponent } from './sub-unit-selector.component';

describe('SubUnitSelectorComponent', () => {
  let component: SubUnitSelectorComponent;
  let fixture: ComponentFixture<SubUnitSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubUnitSelectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SubUnitSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
