import { Component, OnInit } from '@angular/core';

import { SessionService, ShareMapService } from '@services';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';
import { SNACK_ERROR_CONFIG, SNACK_NOTICE_CONFIG } from '@shared';
import { firstValueFrom } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-share-explore-dialog',
  templateUrl: './share-explore-dialog.component.html',
  styleUrls: ['./share-explore-dialog.component.scss'],
})
export class ShareExploreDialogComponent implements OnInit {
  link: string | null = null;
  error = false;
  selectedRegion$ = this.sessionService.region$.asObservable();

  constructor(
    private dialogRef: MatDialogRef<ShareExploreDialogComponent>,
    private sessionService: SessionService,
    private shareMapService: ShareMapService,
    private matSnackBar: MatSnackBar
  ) {}

  async submit() {
    this.matSnackBar.open(
      '[Error] Unable to create plan due to backend error.',
      'Dismiss',
      SNACK_ERROR_CONFIG
    );
  }

  //TODO add cancel button
  cancel(): void {
    this.dialogRef.close();
  }

  async ngOnInit() {
    const mapViewOptions = await firstValueFrom(
      this.sessionService.mapViewOptions$
    );

    const mapConfigs = await firstValueFrom(this.sessionService.mapConfigs$);
    const region = await firstValueFrom(this.selectedRegion$);
    if (mapConfigs && region) {
      const mapConfig = mapConfigs[region];
      const data = { mapViewOptions, mapConfig, region };
      this.shareMapService.getSharedLink(data).subscribe((linkUrl) => {
        this.link = linkUrl;
      });
    }
  }

  selectText(event: Event) {
    const target = event.target as HTMLInputElement;
    target.select();
  }

  copy() {
    navigator.clipboard.writeText(this.link || '');
    this.matSnackBar.open('Link copied ', 'Dismiss', SNACK_NOTICE_CONFIG);
  }
}
