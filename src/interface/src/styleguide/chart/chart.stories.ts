import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate, moduleMetadata } from '@storybook/angular';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChartComponent } from './chart.component';
import { NgChartsModule } from 'ng2-charts';

const meta: Meta<ChartComponent> = {
  title: 'Components/Chart',
  component: ChartComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [BrowserAnimationsModule, NgChartsModule],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `<sg-chart ${argsToTemplate(args)}></sg-chart>`,
  }),
};

const data = {
  labels: [1, 2, 3, 4, 5, 6, 7],
  datasets: [
    {
      data: [65, 59, 80, 81, 56, 55, 40],
    },
  ],
};
const options = {
  maintainAspectRatio: false,
};

export default meta;
type Story = StoryObj<ChartComponent>;

export const Default: Story = {
  args: {
    type: 'bar',
    data: data,
    options: options,
    xAxisLabel: 'The X Axis Label goes here',
    yAxisLabel: 'The Y Axis Label goes here',
  },
};

export const Line: Story = {
  args: {
    type: 'line',
    data: data,
    options: options,
    xAxisLabel: 'The X Axis Label goes here',
    yAxisLabel: 'The Y Axis Label goes here',
  },
};
