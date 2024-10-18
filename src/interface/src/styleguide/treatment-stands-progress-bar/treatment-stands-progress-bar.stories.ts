import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { TreatmentStandsProgressBarComponent } from './treatment-stands-progress-bar.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

const meta: Meta<TreatmentStandsProgressBarComponent> = {
  title: 'Components/Treatment Stands Progress Component',
  component: TreatmentStandsProgressBarComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;"><sg-treatment-progress ${argsToTemplate(args)}></sg-treatment-progress></div>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentStandsProgressBarComponent>;

export const Default: Story = {
  args: {
    totalStands: 100,
    treatedStands: 50,
  },
};

//edge case stories
export const SmallTotal: Story = {
  args: {
    totalStands: 3,
    treatedStands: 2,
  },
};

export const LargeTotal: Story = {
  args: {
    totalStands: 15000,
    treatedStands: 2654,
  },
};

export const ZeroStands: Story = {
  args: {
    totalStands: 0,
    treatedStands: 200,
  },
};
