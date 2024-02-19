import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AreaDetailsComponent } from './area-details.component';

describe('AreaDetailsComponent', () => {
  let component: AreaDetailsComponent;
  let fixture: ComponentFixture<AreaDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AreaDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AreaDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
