import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseLayerToggleComponent } from './base-layer-toggle.component';

describe('BaseLayerToggleComponent', () => {
  let component: BaseLayerToggleComponent;
  let fixture: ComponentFixture<BaseLayerToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayerToggleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaseLayerToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
