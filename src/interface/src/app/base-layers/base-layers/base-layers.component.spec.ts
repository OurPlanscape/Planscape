import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseLayersComponent } from './base-layers.component';

describe('BaseLayersComponent', () => {
  let component: BaseLayersComponent;
  let fixture: ComponentFixture<BaseLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BaseLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
