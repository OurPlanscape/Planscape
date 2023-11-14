import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { take } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MapService } from './../../../services/map.service';
import { ConditionsConfig } from './../../../types/data.types';
import {
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '../../../types/scenario.types';

interface PriorityRow {
  selected?: boolean;
  visible?: boolean; // Visible as raster data on map
  expanded?: boolean; // Children in table are not hidden
  hidden?: boolean; // Row hidden from table (independent of "visible" attribute)
  disabled?: boolean; // Cannot be selected (because ancestor is selected)
  conditionName: string;
  displayName?: string;
  filepath: string;
  children: PriorityRow[];
  level: number;
}

@Component({
  selector: 'app-set-priorities',
  templateUrl: './set-priorities.component.html',
  styleUrls: ['./set-priorities.component.scss'],
})
export class SetPrioritiesComponent implements OnInit, OnChanges {
  @Input() treatmentGoals$: TreatmentGoalConfig[] | null = null;
  @Input() selectedTreatmentQuestion: TreatmentQuestionConfig | null = null;
  @Output() changeConditionEvent = new EventEmitter<string>();

  formGroup = this.fb.group({
    selectedQuestion: [this.selectedTreatmentQuestion, Validators.required],
  });

  datasource = new MatTableDataSource<PriorityRow>();

  constructor(
    private mapService: MapService,
    private fb: FormBuilder
  ) {}

  createForm() {
    this.formGroup = this.fb.group({
      selectedQuestion: [this.selectedTreatmentQuestion, Validators.required],
    });
    return this.formGroup;
  }

  ngOnInit(): void {
    this.mapService.conditionsConfig$
      .pipe(
        filter((result) => !!result),
        take(1)
      )
      .subscribe((conditionsConfig) => {
        this.datasource.data = this.conditionsConfigToPriorityData(
          conditionsConfig!
        );
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.selectedTreatmentQuestion) {
      let selectedQuestion: TreatmentQuestionConfig | undefined;
      this.treatmentGoals$?.some((goal) => {
        selectedQuestion = goal.questions.find(
          (question) =>
            question.short_question_text ===
            this.selectedTreatmentQuestion?.short_question_text
        );
        return !!selectedQuestion;
      });
      if (this.treatmentGoals$ && selectedQuestion) {
        this.formGroup.get('selectedQuestion')?.setValue(selectedQuestion);
      }
      this.formGroup.disable();
    }
  }

  private conditionsConfigToPriorityData(
    config: ConditionsConfig
  ): PriorityRow[] {
    let data: PriorityRow[] = [];
    config.pillars
      ?.filter((pillar) => pillar.display)
      .forEach((pillar) => {
        let pillarRow: PriorityRow = {
          conditionName: pillar.pillar_name!,
          displayName: pillar.display_name,
          filepath: pillar.filepath!.concat('_normalized'),
          children: [],
          level: 0,
          expanded: false,
        };
        data.push(pillarRow);
        pillar.elements
          ?.filter((element) => element.display)
          .forEach((element) => {
            let elementRow: PriorityRow = {
              conditionName: element.element_name!,
              displayName: element.display_name,
              filepath: element.filepath!.concat('_normalized'),
              children: [],
              level: 1,
              expanded: false,
              hidden: true,
            };
            data.push(elementRow);
            pillarRow.children.push(elementRow);
            element.metrics
              ?.filter((metric) => !!metric.filepath)
              .forEach((metric) => {
                let metricRow: PriorityRow = {
                  conditionName: metric.metric_name!,
                  displayName: metric.display_name,
                  filepath: metric.filepath!.concat('_normalized'),
                  children: [],
                  level: 2,
                  hidden: true,
                };
                data.push(metricRow);
                elementRow.children.push(metricRow);
              });
          });
      });
    return data;
  }
}
