import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { StepsNavComponent } from './steps-nav.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const meta: Meta<StepsNavComponent> = {
  title: 'Components/StepsNav',
  component: StepsNavComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        MatIconModule,
        BrowserAnimationsModule,
        StepsNavComponent,
      ],
    }),
  ],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<StepsNavComponent>;

// Basic standalone usage
export const Basic: Story = {
  args: {
    steps: [
      { label: 'Select Data Layers' },
      { label: 'Assign Favorability' },
      { label: 'Assign Pillars' },
      { label: 'Run Analysis' },
    ],
    selectedIndex: 0,
    allowNavigation: true,
  },
};

// Current step in the middle
export const CurrentStepInMiddle: Story = {
  args: {
    steps: [
      { label: 'Personal Info', completed: true },
      { label: 'Contact Details', completed: false },
      { label: 'Additional Info' },
      { label: 'Review' },
    ],
    selectedIndex: 1,
    allowNavigation: true,
  },
};

// Progress with completed steps
export const WithProgress: Story = {
  args: {
    steps: [
      { label: 'Setup', completed: true },
      { label: 'Configure', completed: true },
      { label: 'Review', completed: false },
      { label: 'Deploy' },
    ],
    selectedIndex: 2,
    allowNavigation: true,
  },
};

// Linear mode (restricted navigation)
export const LinearMode: Story = {
  args: {
    steps: [
      { label: 'Step 1', completed: true },
      { label: 'Step 2', completed: true },
      { label: 'Step 3', completed: false },
      { label: 'Step 4' },
    ],
    selectedIndex: 2,
    linear: true,
    allowNavigation: true,
  },
};

// Navigation disabled
export const NavigationDisabled: Story = {
  args: {
    steps: [
      { label: 'Read Only 1', completed: true },
      { label: 'Read Only 2', completed: false },
      { label: 'Read Only 3' },
    ],
    selectedIndex: 1,
    allowNavigation: false,
  },
};

// First step selected
export const FirstStep: Story = {
  args: {
    steps: [
      { label: 'Introduction', completed: false },
      { label: 'Configuration' },
      { label: 'Advanced Settings' },
      { label: 'Review' },
    ],
    selectedIndex: 0,
    allowNavigation: true,
  },
};

// Last step selected
export const LastStep: Story = {
  args: {
    steps: [
      { label: 'Introduction', completed: true },
      { label: 'Configuration', completed: true },
      { label: 'Advanced Settings', completed: true },
      { label: 'Review', completed: false },
    ],
    selectedIndex: 3,
    allowNavigation: true,
  },
};

// Many steps (scrollable scenario)
export const ManySteps: Story = {
  args: {
    steps: [
      { label: 'Step 1', completed: true },
      { label: 'Step 2', completed: true },
      { label: 'Step 3', completed: true },
      { label: 'Step 4', completed: true },
      { label: 'Step 5', completed: false },
      { label: 'Step 6' },
      { label: 'Step 7' },
      { label: 'Step 8' },
    ],
    selectedIndex: 4,
    allowNavigation: true,
  },
};

// Short labels
export const ShortLabels: Story = {
  args: {
    steps: [
      { label: '1', completed: true },
      { label: '2', completed: true },
      { label: '3', completed: false },
      { label: '4' },
    ],
    selectedIndex: 2,
    allowNavigation: true,
  },
};

// Long labels
export const LongLabels: Story = {
  args: {
    steps: [
      { label: 'Initial Data Collection and Validation', completed: true },
      { label: 'Advanced Configuration Parameters', completed: false },
      { label: 'Final Review and Submission Process' },
    ],
    selectedIndex: 1,
    allowNavigation: true,
  },
};
