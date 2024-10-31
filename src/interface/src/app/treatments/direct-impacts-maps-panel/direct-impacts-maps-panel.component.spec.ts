import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapsPanelComponent } from './direct-impacts-maps-panel.component';

describe('DirectImpactsMapsPanelComponent', () => {
  let component: DirectImpactsMapsPanelComponent;
  let fixture: ComponentFixture<DirectImpactsMapsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapsPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DirectImpactsMapsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
