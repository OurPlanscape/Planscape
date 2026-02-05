import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { SectionComponent, ButtonComponent, StepDirective } from '@styleguide';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { NamePillarModalComponent } from '@plan/climate-foresight/name-pillar-modal/name-pillar-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { DeleteDialogComponent } from '@standalone/delete-dialog/delete-dialog.component';
import { ClimateForesightService } from '@services';
import { ClimateForesightRun, DataLayer, InputDatalayer, Pillar } from '@types';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormGroup } from '@angular/forms';
import { PillarDragAndDrop } from '../climate-foresight-run.component';

@Component({
  selector: 'app-assign-pillars',
  standalone: true,
  imports: [
    CommonModule,
    SectionComponent,
    ButtonComponent,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    ButtonComponent,
    MatProgressSpinnerModule,
  ],
  providers: [{ provide: StepDirective, useExisting: AssignPillarsComponent }],
  templateUrl: './assign-pillars.component.html',
  styleUrl: './assign-pillars.component.scss',
})
export class AssignPillarsComponent
  extends StepDirective<any>
  implements OnChanges
{
  @Input({ required: true }) run!: ClimateForesightRun;
  @Output() pillarsUpdated = new EventEmitter();

  private dialog: MatDialog = inject(MatDialog);
  climateService: ClimateForesightService = inject(ClimateForesightService);

  datalayers: DataLayer[] = [];
  pillars: PillarDragAndDrop[] = [];

  loadingDatalayers = false;
  loadingPillars = false;

  form: FormGroup = new FormGroup({});

  constructor() {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['run'] && this.run) {
      this.getDataLayers();
    }
  }

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.pillarsUpdated.emit(this.getData());
  }

  addPillar() {
    this.dialog
      .open(NamePillarModalComponent, {
        data: {
          runId: this.run.id,
        },
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse) {
          this.getPillars();
        }
      });
  }

  editPillar(pillar: Pillar) {
    this.dialog
      .open(NamePillarModalComponent, {
        data: {
          pillar: pillar,
          runId: this.run.id,
        },
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse) {
          this.getPillars();
        }
      });
  }

  deletePillar(id: number) {
    this.dialog
      .open(DeleteDialogComponent, {
        data: {
          title: 'Delete pillar',
          body: 'This will remove the pillar, but all data layers inside will remain and return to the selected data layers list. Are you sure you want to delete this pillar?',
        },
      })
      .afterClosed()
      .subscribe((modalResponse: any) => {
        if (modalResponse === true) {
          this.climateService.deletePillar(id, this.run.id).subscribe((res) => {
            this.getPillars();
          });
        }
      });
  }

  getDataLayers() {
    this.loadingDatalayers = true;
    this.loadingPillars = true;
    this.climateService.getDataLayers().subscribe({
      next: (datalayers) => {
        // Filtering just the enabled datalayers
        const enabledLayers =
          datalayers.filter(
            (dl: any) =>
              dl.metadata?.modules?.['climate_foresight']?.enabled === true
          ) || [];
        // geting the selected datalayers id
        const availableLayerIDs = this.run.input_datalayers?.map(
          (dl) => dl.datalayer
        );
        // Filtering just the available datalayers
        const availableLayers = enabledLayers.filter((dl: DataLayer) =>
          availableLayerIDs?.includes(dl.id)
        );
        this.datalayers = availableLayers;
        this.getPillars();
      },
      error: () => {
        this.loadingDatalayers = false;
      },
    });
  }

  getPillars() {
    this.loadingPillars = true;
    this.climateService.getPillars(this.run.id).subscribe({
      next: (res) => {
        this.pillars = res.map((p) => {
          // Filtering the list of input layers for a particular pillar
          const assignedLayers = this.run.input_datalayers.filter(
            (d) => d.pillar === p.id
          );
          // Getting the selected DataLayers that match our InputDatalayer
          const pillarLayers = this.datalayers.filter((d) =>
            assignedLayers.some((layer) => layer.datalayer === d.id)
          );
          // Removing assigned Datalayers from the unassigned list
          this.datalayers = this.datalayers.filter((d) =>
            assignedLayers.every((layer) => layer.datalayer !== d.id)
          );
          const obj: PillarDragAndDrop = {
            ...p,
            isOpen: false,
            dataLayers: pillarLayers,
          };
          return obj;
        });
        this.loadingPillars = false;
        this.loadingDatalayers = false;
      },
      error: () => {
        this.loadingPillars = false;
        this.loadingDatalayers = false;
      },
    });
  }

  getData() {
    return this.assignPillarsToInputLayers(this.pillars);
  }

  assignPillarsToInputLayers(
    pillars: PillarDragAndDrop[]
  ): Partial<InputDatalayer>[] {
    let inputDatalayers: Partial<InputDatalayer>[] = [];
    pillars.forEach((pillar) => {
      pillar.dataLayers.forEach((dl: DataLayer) => {
        const inputDl: Partial<InputDatalayer> = {
          datalayer: dl.id,
          pillar: pillar.id,
        };
        inputDatalayers.push(inputDl);
      });
    });
    return inputDatalayers;
  }
}
