import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { NgClass, NgFor, NgIf, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  MatExpansionModule,
  MatExpansionPanel,
  MatExpansionPanelHeader,
} from '@angular/material/expansion';
import { TreatmentTypeIconComponent } from '../treatment-type-icon/treatment-type-icon.component';
import { SequenceIconComponent } from '../sequence-icon/sequence-icon.component';
import { TreatmentProjectArea } from '@types';
import {
  PRESCRIPTIONS,
  PrescriptionSingleAction,
  PrescriptionSequenceAction,
} from 'src/app/treatments/prescriptions';
/**
 * Project Area Expander component
 * A component to be used in the Project Area panel to show project area details
 */
@Component({
  selector: 'sg-project-area-expander',
  standalone: true,
  imports: [
    MatExpansionModule,
    MatIconModule,
    NgClass,
    NgIf,
    NgFor,
    SequenceIconComponent,
    TreatmentTypeIconComponent,
    DecimalPipe,
  ],
  templateUrl: './project-area-expander.component.html',
  styleUrl: './project-area-expander.component.scss',
})
export class ProjectAreaExpanderComponent implements AfterViewInit {
  constructor(private cdr: ChangeDetectorRef) {}

  @ViewChild('header') header!: MatExpansionPanelHeader;
  @ViewChild(MatExpansionPanel) panel!: MatExpansionPanel;

  /**
   * Optional title text -- explicitly overrides the derived title
   */
  @Input() title: string | null = null;
  /**
   * Whether or not this is the selected expander
   */
  @Input() selected = false;
  /**
   * A TreatmentProjectArea record, with an array of prescriptions
   */
  @Input() projectArea!: TreatmentProjectArea;
  @Output() hoverEvent = new EventEmitter<boolean>();
  @Output() headerClick = new EventEmitter();
  openState = false;

  ngAfterViewInit() {
    // Disable the click handler on the header
    this.header._toggle = () => {};
    this.cdr.detectChanges();
  }

  togglePanel(event: Event): void {
    event.stopPropagation();
    this.panel.toggle();
  }

  onHeaderClick(event: MouseEvent): void {
    // Prevent the default expansion behavior
    const target = event.target as HTMLElement;
    if (!target.classList.contains('mat-expansion-indicator')) {
      event.preventDefault();
      event.stopPropagation();
      this.headerClick.emit();
    } else {
      this.togglePanel(event);
    }
  }

  toggleState() {
    this.openState = !this.openState;
  }

  headingTitleText(action: string, type: string): string | null {
    if (type === 'SINGLE') {
      let title = action as PrescriptionSingleAction;
      if (title !== null) {
        return PRESCRIPTIONS.SINGLE[title];
      }
    } else if (type === 'SEQUENCE') {
      let title = action as PrescriptionSequenceAction;
      if (title !== null) {
        return PRESCRIPTIONS.SEQUENCE[title].name;
      }
    }
    return '';
  }

  handleHover($event: Event) {
    this.hoverEvent.emit(true);
  }

  treatedStandCount(): number {
    const treatedStands = this.projectArea.prescriptions
      .map((record) => record.treated_stand_count)
      .reduce((acc, count) => acc + count, 0);

    return (treatedStands * 100) / this.projectArea.total_stand_count;
  }

  sequenceActions(action: string): string[] {
    let title = action as PrescriptionSequenceAction;
    if (title !== null) {
      return PRESCRIPTIONS.SEQUENCE[title].details;
    }
    return [];
  }

  get isSelected() {
    return this.selected;
  }
}
