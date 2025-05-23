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
    template: `<div ${containerStyle}><div style='width:400px;'><sg-treatment-expander ${argsToTemplate(args)}></sg-treatment-expander></div>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentExpanderComponent>;

export const Default: Story = {
  args: {
    action: 'MODERATE_THINNING_BURN',
    treatedStandCount: 11,
    standIds: [1, 2, 3, 8, 10],
    areaAcres: 117,
    treatmentType: 'SINGLE',
    projectAreaTotalAcres: 1200,
  },
};

export const Sequence1: Story = {
  args: {
    action: 'MODERATE_THINNING_BURN_PLUS_RX_FIRE',
    treatmentType: 'SEQUENCE',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 1,
    projectAreaTotalAcres: 1200,
  },
};
export const Sequence5: Story = {
  args: {
    action: 'RX_FIRE_PLUS_RX_FIRE',
    treatmentType: 'SEQUENCE',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 5,
    projectAreaTotalAcres: 1200,
  },
};

export const TreatmentModerateMastication: Story = {
  args: {
    treatmentType: 'SINGLE',
    action: 'MODERATE_MASTICATION',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 8,
    projectAreaTotalAcres: 1200,
  },
};

export const TreatmentHeavyMastication: Story = {
  args: {
    treatmentType: 'SINGLE',
    action: 'HEAVY_MASTICATION',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 600,
    projectAreaTotalAcres: 1200,
  },
};

export const TreatmentHeavyThinning: Story = {
  args: {
    treatmentType: 'SINGLE',
    action: 'HEAVY_THINNING_BURN',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 5,
    projectAreaTotalAcres: 1200,
  },
};

export const TreatmentMasticationAndFireSelected: Story = {
  args: {
    treatmentType: 'SINGLE',
    action: 'MASTICATION_RX_FIRE',
    treatedStandCount: 17,
    standIds: [1, 2, 3, 8, 10],
    areaAcres: 117,
    selected: true,
    projectAreaTotalAcres: 1200,
  },
};

export const OverriddenTitle: Story = {
  args: {
    treatmentType: 'SINGLE',
    title: 'Special Title',
    action: 'MODERATE_THINNING_BURN',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 11,
    projectAreaTotalAcres: 1200,
  },
};

export const WrappedTitle: Story = {
  args: {
    treatmentType: 'SINGLE',
    title:
      'Here Is An Excessively Long Title That Should Wrap And Expand The Header To Accommodate Whatever Size It Becomes',
    action: 'MODERATE_THINNING_BURN',
    areaAcres: 117,
    standIds: [1, 2, 3, 8, 10],
    treatedStandCount: 11,
    projectAreaTotalAcres: 1200,
  },
};
