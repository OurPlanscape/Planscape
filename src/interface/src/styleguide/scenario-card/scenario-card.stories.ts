import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ScenarioCardComponent } from './scenario-card.component';
import { ProjectArea } from 'src/app/types';

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

const sampleProjectArea1: ProjectArea = {
  id: '1',
  projectId: '1',
  projectArea: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [123.456, -78.901],
    },
    properties: {},
  },
  owner: '',
  estimatedAreaTreated: 1,
  actualAcresTreated: 1,
};
const sampleProjectArea2: ProjectArea = { ...sampleProjectArea1 };
const sampleProjectArea3: ProjectArea = { ...sampleProjectArea1 };

export const Default: Story = {
  args: {
    scenario: {
      id: '0',
      name: 'Test Scenario',
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
        est_cost: 1234567,
        max_budget: 1234567,
        max_slope: 1,
        max_treatment_area_ratio: 1,
        min_distance_from_road: 1,
        project_areas: [
          sampleProjectArea1,
          sampleProjectArea2,
          sampleProjectArea3,
        ],
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
      name: 'Test Scenario',
      planning_area: 'ok',
      status: 'ACTIVE',
      scenario_result: {
        ...Default.args?.scenario?.scenario_result,
        status: 'RUNNING',
        completed_at: '2021-01-01',
        result: { type: '', features: [] },
      },
      configuration: { ...Default.args?.scenario?.configuration },
    },
  },
};

export const Done: Story = {
  args: {
    scenario: {
      ...Default.args?.scenario,
      name: 'Test Scenario',
      planning_area: 'ok',
      status: 'ACTIVE',
      scenario_result: {
        ...Default.args?.scenario?.scenario_result,
        status: 'SUCCESS',
        completed_at: '2021-01-01',
        result: { type: '', features: [] },
      },
      configuration: { ...Default.args?.scenario?.configuration },
    },
  },
};

export const Failed: Story = {
  args: {
    scenario: {
      ...Default.args?.scenario,
      name: 'Test Scenario',
      planning_area: 'ok',
      status: 'ACTIVE',
      scenario_result: {
        ...Default.args?.scenario?.scenario_result,
        status: 'FAILURE',
        completed_at: '2021-01-01',
        result: { type: '', features: [] },
      },
      configuration: { ...Default.args?.scenario?.configuration },
    },
  },
};
