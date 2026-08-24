import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { DataLayerSelectionComponent } from '@app/plan/climate-foresight/climate-foresight-run/data-layer-selection/data-layer-selection.component';
import { SectionComponent } from '@styleguide';
import { AdvStandLevelConstraintsModalComponent } from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { take } from 'rxjs';

@Component({
  selector: 'app-adv-stand-level-constraints',
  standalone: true,
  imports: [
    CommonModule,
    DataLayerSelectionComponent,
    DataLayersComponent,
    AdvStandLevelConstraintsModalComponent,
    SectionComponent,
    MatExpansionModule,
  ],
  templateUrl: './adv-stand-level-constraints.component.html',
  styleUrl: './adv-stand-level-constraints.component.scss',
})
export class AdvStandLevelConstraintsComponent {
  constructor(private dialog: MatDialog) {}

  // TODO: remove this:
  handleClickOpenModal() {
    const dialogRef = this.dialog.open(AdvStandLevelConstraintsModalComponent, {
      maxWidth: '560px',
      data: { dataLayerName: 'Data Layer Name' },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          console.log('here is the result:', confirmed);
          // store the constraint
        }
      });
  }
}
