import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareExploreDialogComponent } from './share-explore-dialog.component';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { MockProvider } from 'ng-mocks';
import { MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { ShareMapService } from '@services';

describe('ShareExploreDialogComponent', () => {
  let component: ShareExploreDialogComponent;
  let fixture: ComponentFixture<ShareExploreDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShareExploreDialogComponent],
      imports: [LegacyMaterialModule],
      providers: [MockProvider(MatDialogRef), MockProvider(ShareMapService)],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareExploreDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
