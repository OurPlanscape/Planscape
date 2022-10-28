import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegionSelectionComponent } from './region-selection.component';

describe('RegionSelectionComponent', () => {
  let component: RegionSelectionComponent;
  let fixture: ComponentFixture<RegionSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegionSelectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegionSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
