import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ScenarioCardComponent } from './scenario-card.component';

const meta: Meta<ScenarioCardComponent> = {
  title: 'Components/Scenario Card',
  component: ScenarioCardComponent,
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-scenario-card ${argsToTemplate(args)}></sg-scenario-card>`,
  }),
};

export default meta;
type Story = StoryObj<ScenarioCardComponent>;

export const Default: Story = {
  args: {
    scenario: {
      id: '0',
      name: 'Scenario Name',
      planning_area: 'Planning Area',
      notes: 'notes!',
      status: 'ACTIVE',
      user: 1,
      creator: 'Larry Larrington',
      created_at: '2024-01-01 12:34:00',
      scenario_result: {
        status: 'LOADING',
        completed_at: '2020-01-01',
        result: { features: [], type: 'ok' },
      },
      configuration: {
        est_cost: 1,
        max_budget: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        min_distance_from_road: 1,
        project_areas: [],
        treatment_question: null,
        excluded_areas: [],
        stand_size: 'SMALL',
        scenario_priorities: [],
        question_id: 5,
      },
    },
  },
};

export const Running: Story = {
  args: {
    scenario: {
      ...Default.args?.scenario,
      id: '0',
      name: 'Scenario Name',
      planning_area: 'Planning Area',
      notes: 'notes!',
      status: 'ACTIVE',
      user: 1,
      creator: 'Larry Larrington',
      scenario_result: {
        status: 'RUNNING',
        completed_at: '2020-01-01',
        result: { features: [], type: 'ok' },
      },
      configuration: {
        est_cost: 1,
        max_budget: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        min_distance_from_road: 1,
        project_areas: [],
        treatment_question: null,
        excluded_areas: [],
        stand_size: 'SMALL',
        scenario_priorities: [],
        question_id: 5,
      },
    },
  },
};

export const Done: Story = {
  args: {
    scenario: {
      id: '0',
      name: 'Scenario Name',
      planning_area: 'Planning Area',
      notes: 'notes!',
      scenario_result: {
        status: 'SUCCESS',
        completed_at: '2020-01-01',
        result: { features: [], type: 'ok' },
      },
      status: 'ACTIVE',
      user: 1,
      creator: 'Larry Larrington',
      configuration: {
        est_cost: 1,
        max_budget: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        min_distance_from_road: 1,
        project_areas: [],
        treatment_question: null,
        excluded_areas: [],
        stand_size: 'SMALL',
        scenario_priorities: [],
        question_id: 5,
      },
    },
  },
};

export const Failed: Story = {
  args: {
    scenario: {
      id: '0',
      name: 'Scenario Name',
      planning_area: 'Planning Area',
      notes: 'notes!',
      status: 'ACTIVE',
      user: 1,
      creator: 'Larry Larrington',
      scenario_result: {
        status: 'FAILURE',
        completed_at: '2020-01-01',
        result: { features: [], type: 'ok' },
      },
      configuration: {
        est_cost: 1,
        max_budget: 1,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        min_distance_from_road: 1,
        project_areas: [],
        treatment_question: null,
        excluded_areas: [],
        stand_size: 'SMALL',
        scenario_priorities: [],
        question_id: 5,
      },
    },
  },
};
