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
      name: 'Scenario Name',
      est_budget: 100.0,
      planning_area: 'ok',
      area_count: 5,
      configuration: {},
      status: 'ACTIVE',
      treatment_plans_count: 5,
      creator: 'Larry Larrington',
      created_at: '2023-12-12',
    },
  },
};

export const Running: Story = {
  args: {
    scenario: {
      ...Default.args?.scenario,
      status: 'RUNNING',
    },
  },
};

export const Done: Story = {
  args: {
    scenario: {
      ...Default.args?.scenario,
      status: 'DONE',
    },
  },
};

export const Failed: Story = {
  args: {
    scenario: {
      ...Default.args?.scenario,
      status: 'FAILED',
    },
  },
};
