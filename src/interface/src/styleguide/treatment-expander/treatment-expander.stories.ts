import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { TreatmentExpanderComponent } from './treatment-expander.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

const meta: Meta<TreatmentExpanderComponent> = {
  title: 'Components/Treatment Expander',
  component: TreatmentExpanderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;"><sg-treatment-expander ${argsToTemplate(args)}></sg-treatment-expander></div>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentExpanderComponent>;

export const Default: Story = {
  args: {
    treatmentType: 'Moderate thin & Pile burn',
    standCount: '11',
  },
};

export const Sequence1: Story = {
  args: {
    sequenceNumber: 1,
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
    standCount: '1/11',
  },
};
export const Sequence5: Story = {
  args: {
    sequenceNumber: 5,
    rxDetails: [
      { name: 'Moderate mastication & Pile burn', year: 0 },
      { name: 'Prescribed fire', year: 0 },
    ],
    standCount: '5/11',
  },
};

export const TreatmentModerateMastication: Story = {
  args: {
    treatmentType: 'Moderate mastication',
    rxDetails: [],
    standCount: '8',
  },
};

export const TreatmentHeavyMastication: Story = {
  args: {
    treatmentType: 'Heavy mastication',
    rxDetails: [],
    standCount: '600',
  },
};

export const TreatmentPrescribedFire: Story = {
  args: {
    treatmentType: 'Prescribed fire',
    rxDetails: [],
    standCount: '5',
  },
};

export const TreatmentMasticationAndFireSelected: Story = {
  args: {
    treatmentType: 'Mastication & RX fire',
    rxDetails: [],
    standCount: '5',
    selected: true,
  },
};

export const OverriddenTitle: Story = {
  args: {
    title: 'Special Title',
    treatmentType: 'Moderate thin & Pile burn',
    standCount: '11',
  },
};
