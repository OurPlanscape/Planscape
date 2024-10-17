import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { ScenarioCardComponent } from './scenario-card.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<ScenarioCardComponent> = {
  title: 'Components/Scenario Card',
  component: ScenarioCardComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
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
    name: 'Test Scenario',
    areas: 5,
    status: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    budget: 1234567,
    treatmentPlansCount: 5,
  },
};

export const Running: Story = {
  args: {
    ...Default.args,
    status: 'RUNNING',
  },
};

export const Done: Story = {
  args: {
    ...Default.args,
    status: 'SUCCESS',
  },
};

export const Failed: Story = {
  args: {
    ...Default.args,
    status: 'FAILURE',
  },
};

export const TreatmentsPlansEnabled: Story = {
  args: {
    name: 'Test Scenario',
    areas: 5,
    status: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    budget: 1234567,
    treatmentPlansCount: 5,
    treatmentPlansEnabled: true,
  },
};

export const UserCanArchiveScenario: Story = {
  args: {
    name: 'Test Scenario',
    areas: 5,
    status: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    budget: 1234567,
    treatmentPlansCount: 5,
    treatmentPlansEnabled: true,
    userCanArchiveScenario: true,
  },
};
