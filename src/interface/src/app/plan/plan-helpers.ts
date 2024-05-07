import {
  ConditionsConfig,
  PriorityRow,
  ScenarioResult,
  TreatmentGoalConfig,
  TreatmentQuestionConfig,
} from '@types';
import {
  ProjectAreaReport,
  ProjectTotalReport,
} from './project-areas/project-areas.component';
import { DEFAULT_AREA_COLOR, PROJECT_AREA_COLORS } from '@shared';

export const NOTE_SAVE_INTERVAL = 5000;

export const POLLING_INTERVAL = 3000;

// sizes in hectares
export const STAND_SIZES: Record<string, number> = {
  SMALL: 10,
  MEDIUM: 100,
  LARGE: 500,
};

export function parseResultsToProjectAreas(
  results: ScenarioResult
): ProjectAreaReport[] {
  return results.result.features.map((featureCollection, i) => {
    const props = featureCollection.properties;
    return {
      id: i + 1,
      acres: props.area_acres,
      percentTotal: props.pct_area,
      estimatedCost: props.total_cost,
      score: props.weightedPriority,
    };
  });
}

export function parseResultsToTotals(
  areaReports: ProjectAreaReport[]
): ProjectTotalReport {
  return areaReports.reduce(
    (acc, value) => {
      acc.acres += value.acres;
      acc.estimatedCost += value.estimatedCost;
      acc.percentTotal += value.percentTotal;
      return acc;
    },
    {
      acres: 0,
      percentTotal: 0,
      estimatedCost: 0,
    }
  );
}

/**
 *
 * @param position rank position (1 based index) of scenario projection
 */
export function getColorForProjectPosition(position: number) {
  if (position < 1) {
    return DEFAULT_AREA_COLOR;
  }
  return PROJECT_AREA_COLORS[(position - 1) % PROJECT_AREA_COLORS.length];
}

export function findQuestionOnTreatmentGoalsConfig(
  treatmentGoalConfigs: TreatmentGoalConfig[],
  treatmentQuestion: TreatmentQuestionConfig
) {
  let selectedQuestion: TreatmentQuestionConfig | undefined;
  treatmentGoalConfigs.some((goal) => {
    selectedQuestion = goal.questions.find(
      (question) => question.id === treatmentQuestion?.id
    );
    return !!selectedQuestion;
  });
  return selectedQuestion;
}

export function conditionsConfigToPriorityData(
  config: ConditionsConfig
): PriorityRow[] {
  let data: PriorityRow[] = [];
  config.pillars
    ?.filter((pillar) => pillar.display)
    .forEach((pillar) => {
      let pillarRow: PriorityRow = {
        conditionName: pillar.pillar_name!,
        displayName: pillar.display_name,
        filepath: pillar.filepath! ? pillar.filepath.concat('_normalized') : '',
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
            filepath: element.filepath
              ? element.filepath.concat('_normalized')
              : '',
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

export function getPlanPath(planId: number) {
  return '/plan/' + planId;
}

export function isValidTotalArea(area: number) {
  return area >= 100;
}
