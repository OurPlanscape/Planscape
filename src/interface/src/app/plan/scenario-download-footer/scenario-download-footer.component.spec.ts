import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioDownloadFooterComponent } from './scenario-download-footer.component';

describe('ScenarioDownloadFooterComponent', () => {
  let component: ScenarioDownloadFooterComponent;
  let fixture: ComponentFixture<ScenarioDownloadFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioDownloadFooterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScenarioDownloadFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
