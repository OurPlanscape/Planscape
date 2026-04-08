import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { DetailsCardComponent, CardDetails } from './details-card.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const mockDetails: CardDetails[] = [
  {
    icon: 'person_outline',
    label: 'Creator',
    value: 'Luis Lopez',
  },
  {
    icon: 'crop_landscape',
    label: 'Acres',
    value: '1250',
  },
  {
    icon: 'calendar_month',
    label: 'Created Date',
    value: '08/04/2026',
  },
];

const meta: Meta<DetailsCardComponent> = {
  title: 'Components/Details Card',
  component: DetailsCardComponent,
  tags: ['autodocs'],

  decorators: [
    moduleMetadata({
      imports: [DetailsCardComponent, BrowserAnimationsModule],
    }),
  ],
  args: {
    title: 'Plan Details',
    subtitle: 'Forest Restoration Plan',
    details: mockDetails,
  },
};

export default meta;

type Story = StoryObj<DetailsCardComponent>;

export const Default: Story = {};

export const ManyItems: Story = {
  args: {
    details: Array.from({ length: 12 }, (_, i) => ({
      icon: 'info',
      label: `Field ${i + 1}`,
      value: `Value ${i + 1}`,
    })),
  },
};

export const Empty: Story = {
  args: {
    details: [],
  },
};

export const LongValues: Story = {
  args: {
    details: [
      {
        icon: 'description',
        label: 'Description',
        value:
          'This is a very long value to test how the component behaves with long text inside the detail line',
      },
      {
        icon: 'place',
        label: 'Location',
        value:
          'California, USA - Some very long location name to stress the layout',
      },
    ],
  },
};

export const PlanningDetails: Story = {
  args: {
    details: [],
    creator: 'Luke Skywalker',
    acres: 52572,
    created_at: '2026-04-07T12:09:36Z',
  },
};
