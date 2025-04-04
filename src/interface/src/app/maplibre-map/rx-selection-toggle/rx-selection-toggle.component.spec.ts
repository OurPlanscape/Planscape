import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RxSelectionToggleComponent } from './rx-selection-toggle.component';

describe('RxSelectionToggleComponent', () => {
  let component: RxSelectionToggleComponent;
  let fixture: ComponentFixture<RxSelectionToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RxSelectionToggleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RxSelectionToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
