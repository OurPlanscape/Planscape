import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareExploreDialogComponent } from './share-explore-dialog.component';

describe('ShareExploreDialogComponent', () => {
  let component: ShareExploreDialogComponent;
  let fixture: ComponentFixture<ShareExploreDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ShareExploreDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareExploreDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
