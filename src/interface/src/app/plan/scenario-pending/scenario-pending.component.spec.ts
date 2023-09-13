import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioPendingComponent } from './scenario-pending.component';

describe('ScenarioPendingComponent', () => {
  let component: ScenarioPendingComponent;
  let fixture: ComponentFixture<ScenarioPendingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ScenarioPendingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScenarioPendingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
