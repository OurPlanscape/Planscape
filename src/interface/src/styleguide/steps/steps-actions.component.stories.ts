import type { Meta, StoryObj } from '@storybook/angular';
import { StepsActionsComponent } from './steps-actions.component';

type StoryArgs = StepsActionsComponent;

/**
 * StepsActionsComponent is a presentational component that displays navigation buttons
 * and step counter for multi-step workflows. It's designed to be a dumb/presentational
 * component that can be placed anywhere in the layout.
 */
const meta: Meta<StoryArgs> = {
  title: 'Components/Steps Actions',
  component: StepsActionsComponent,
  tags: ['autodocs'],
  argTypes: {
    back: { action: 'back' },
    next: { action: 'next' },
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    currentStep: 0,
    totalSteps: 4,
    canGoBack: false,
    canGoNext: true,
    isLastStep: false,
    loading: false,
  },
};

export const MiddleStep: Story = {
  args: {
    currentStep: 2,
    totalSteps: 5,
    canGoBack: true,
    canGoNext: true,
    isLastStep: false,
    loading: false,
  },
};

export const LastStep: Story = {
  args: {
    currentStep: 3,
    totalSteps: 4,
    canGoBack: true,
    canGoNext: true,
    isLastStep: true,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    currentStep: 1,
    totalSteps: 3,
    canGoBack: true,
    canGoNext: true,
    isLastStep: false,
    loading: true,
  },
};

export const DisabledNext: Story = {
  args: {
    currentStep: 1,
    totalSteps: 4,
    canGoBack: true,
    canGoNext: false,
    isLastStep: false,
    loading: false,
  },
};

export const HiddenStepCount: Story = {
  args: {
    currentStep: 1,
    totalSteps: 3,
    canGoBack: true,
    canGoNext: true,
    isLastStep: false,
    loading: false,
    showStepCount: false,
  },
};

export const HiddenBackButton: Story = {
  args: {
    currentStep: 0,
    totalSteps: 3,
    canGoBack: false,
    canGoNext: true,
    isLastStep: false,
    loading: false,
    showBack: false,
  },
};

export const CustomLabels: Story = {
  args: {
    currentStep: 1,
    totalSteps: 3,
    canGoBack: true,
    canGoNext: true,
    isLastStep: false,
    loading: false,
    backLabel: 'Previous',
    continueLabel: 'Next Step',
    finishLabel: 'Complete',
  },
};

export const CustomLabelsLastStep: Story = {
  args: {
    currentStep: 2,
    totalSteps: 3,
    canGoBack: true,
    canGoNext: true,
    isLastStep: true,
    loading: false,
    backLabel: 'Go Back',
    continueLabel: 'Continue',
    finishLabel: 'Submit',
  },
};

export const AllOptionsHidden: Story = {
  args: {
    currentStep: 1,
    totalSteps: 3,
    canGoBack: true,
    canGoNext: true,
    isLastStep: false,
    loading: false,
    showStepCount: false,
    showBack: false,
    showContinue: false,
  },
};
