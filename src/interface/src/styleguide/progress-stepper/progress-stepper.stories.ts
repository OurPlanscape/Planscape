import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import {
  ProgressStepperComponent,
  StepperStep,
} from './progress-stepper.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

const meta: Meta<ProgressStepperComponent> = {
  title: 'Components/ProgressStepper',
  component: ProgressStepperComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, MatIconModule],
    }),
  ],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    currentStep: {
      control: { type: 'number', min: 0, max: 3 },
      description: 'The currently active step index',
    },
    latestStep: {
      control: { type: 'number', min: 0, max: 3 },
      description: 'The highest step the user has reached',
    },
    allowNavigation: {
      control: 'boolean',
      description: 'Whether clicking on steps is allowed',
    },
    stepChange: {
      action: 'stepChange',
      description: 'Event emitted when a step is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<ProgressStepperComponent>;

const defaultSteps: StepperStep[] = [
  { label: 'Select Data Layers' },
  { label: 'Assign Favorability' },
  { label: 'Assign Pillars' },
  { label: 'Save & Run Analysis' },
];

export const FirstStep: Story = {
  args: {
    steps: defaultSteps,
    currentStep: 0,
    latestStep: 0,
    allowNavigation: true,
  },
};

export const InProgress: Story = {
  args: {
    steps: defaultSteps,
    currentStep: 1,
    latestStep: 2,
    allowNavigation: true,
  },
};

export const LastStepActive: Story = {
  args: {
    steps: defaultSteps,
    currentStep: 3,
    latestStep: 3,
    allowNavigation: true,
  },
};

export const AllStepsCompleted: Story = {
  args: {
    steps: defaultSteps,
    currentStep: 0,
    latestStep: 3,
    allowNavigation: true,
  },
};

export const NavigationDisabled: Story = {
  args: {
    steps: defaultSteps,
    currentStep: 1,
    latestStep: 2,
    allowNavigation: false,
  },
};

export const LongLabels: Story = {
  args: {
    steps: [
      { label: 'Select Data Layers and Configure Options' },
      { label: 'Assign Favorability Scores to Each Layer' },
      { label: 'Assign Pillars and Weights' },
      { label: 'Save Configuration and Run Analysis' },
    ],
    currentStep: 2,
    latestStep: 2,
    allowNavigation: true,
  },
};

export const TwoSteps: Story = {
  args: {
    steps: [{ label: 'Configuration' }, { label: 'Review & Submit' }],
    currentStep: 0,
    latestStep: 1,
    allowNavigation: true,
  },
};

export const FiveSteps: Story = {
  args: {
    steps: [
      { label: 'Select Area' },
      { label: 'Data Layers' },
      { label: 'Favorability' },
      { label: 'Pillars' },
      { label: 'Run Analysis' },
    ],
    currentStep: 2,
    latestStep: 3,
    allowNavigation: true,
  },
};

export const Interactive: Story = {
  args: {
    steps: defaultSteps,
  },
  render: (args) => ({
    props: {
      steps: args.steps,
      currentStep: 0,
      latestStep: 0,
      allowNavigation: true,
    },
    template: `
      <div style="padding: 40px; background: #f5f5f5;">
        <sg-progress-stepper
          #stepper
          [steps]="steps"
          [currentStep]="currentStep"
          [latestStep]="latestStep"
          [allowNavigation]="allowNavigation"
          (stepChange)="currentStep = $event">
        </sg-progress-stepper>

        <div style="margin-top: 40px; padding: 20px; background: white; border-radius: 8px;">
          <h3>Current Step: {{ currentStep + 1 }} - {{ steps[currentStep].label }}</h3>
          <p style="margin: 10px 0;">
            <strong>Current Step:</strong> {{ currentStep }} |
            <strong>Latest Step Reached:</strong> {{ latestStep }}
          </p>
          <p>Click on any step up to the "Latest Step" to navigate. Steps beyond are disabled in the UI but can be reached programmatically using the buttons below.</p>
          <div style="margin-top: 20px;">
            <button
              style="margin-right: 10px; padding: 8px 16px;"
              [disabled]="currentStep === 0"
              (click)="stepper.previous()">
              Previous
            </button>
            <button
              style="padding: 8px 16px;"
              [disabled]="currentStep >= steps.length - 1"
              (click)="stepper.next(); latestStep = currentStep > latestStep ? currentStep : latestStep">
              Next
            </button>
          </div>
          <div style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 4px;">
            <small>
              <strong>Note:</strong> The "Next" button simulates programmatic navigation which can advance beyond the latestStep.
              When advancing to a new step, latestStep is automatically updated to unlock that step in the UI.
            </small>
          </div>
        </div>
      </div>
    `,
  }),
};
