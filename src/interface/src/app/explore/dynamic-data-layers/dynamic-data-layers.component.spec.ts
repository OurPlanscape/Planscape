import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicDataLayersComponent } from './dynamic-data-layers.component';

describe('DynamicDataLayersComponent', () => {
  let component: DynamicDataLayersComponent;
  let fixture: ComponentFixture<DynamicDataLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicDataLayersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicDataLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
