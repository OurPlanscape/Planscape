import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExclusionAreasComponent } from './excluded-areas.component';

describe('ExclusionAreasComponent', () => {
  let component: ExclusionAreasComponent;
  let fixture: ComponentFixture<ExclusionAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExclusionAreasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExclusionAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
