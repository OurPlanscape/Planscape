import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncedMapsComponent } from './synced-maps.component';

describe('SyncedMapsComponent', () => {
  let component: SyncedMapsComponent;
  let fixture: ComponentFixture<SyncedMapsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncedMapsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SyncedMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
