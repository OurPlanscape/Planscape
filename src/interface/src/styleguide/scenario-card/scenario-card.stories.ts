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
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
  },
};

export const ProjectArea: Story = {
  args: {
    name: 'Test Project Area',
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    origin: 'USER',
  },
};

export const Running: Story = {
  args: {
    ...Default.args,
    resultStatus: 'RUNNING',
  },
};

export const Done: Story = {
  args: {
    ...Default.args,
    resultStatus: 'SUCCESS',
  },
};

export const Failed: Story = {
  args: {
    ...Default.args,
    resultStatus: 'FAILURE',
  },
};

export const DisabledScenario: Story = {
  args: {
    name: 'Test Scenario',
    resultStatus: 'SUCCESS',
    creator: 'Larry Larrington',
    created_at: '2024-01-01 12:34:00',
    disabled: true,
    contextualMenuEnabled: false,
    userCanDeleteScenario: true,
  },
};
