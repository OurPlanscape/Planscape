import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToolInfoCardComponent } from './tool-info-card.component';

describe('ToolInfoCardComponent', () => {
  let component: ToolInfoCardComponent;
  let fixture: ComponentFixture<ToolInfoCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolInfoCardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ToolInfoCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
