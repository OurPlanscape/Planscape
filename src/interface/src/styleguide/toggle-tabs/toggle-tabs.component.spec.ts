import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToggleTabsComponent } from './toggle-tabs.component';

describe('ToggleTabsComponent', () => {
  let component: ToggleTabsComponent;
  let fixture: ComponentFixture<ToggleTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
