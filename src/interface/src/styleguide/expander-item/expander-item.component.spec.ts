import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpanderItemComponent } from './expander-item.component';

describe('ExpanderItemComponent', () => {
  let component: ExpanderItemComponent;
  let fixture: ComponentFixture<ExpanderItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpanderItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpanderItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
