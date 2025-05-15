import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiMapControlComponent } from './multi-map-control.component';

describe('MultiMapControlComponent', () => {
  let component: MultiMapControlComponent;
  let fixture: ComponentFixture<MultiMapControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiMapControlComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MultiMapControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
