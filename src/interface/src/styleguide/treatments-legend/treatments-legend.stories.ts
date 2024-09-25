import {
  argsToTemplate,
  moduleMetadata,
  Meta,
  StoryObj,
} from '@storybook/angular';
import { TreatmentsLegendComponent } from './treatments-legend.component';
import { PrescriptionSingleAction } from 'src/app/treatments/prescriptions';
import { ModalComponent } from '../modal/modal.component';
import { ModalInfoComponent } from '../modal-info-box/modal-info.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

const mockSingleTreatments: PrescriptionSingleAction[] = [
  'MODERATE_THINNING_BIOMASS',
  'HEAVY_THINNING_BIOMASS',
  'MODERATE_THINNING_BURN',
  'HEAVY_THINNING_BURN',
  'MODERATE_MASTICATION',
  'HEAVY_MASTICATION',
  'RX_FIRE',
  'HEAVY_THINNING_RX_FIRE',
  'MASTICATION_RX_FIRE',
];

const meta: Meta<TreatmentsLegendComponent> = {
  title: 'Components/Treatments Legend',
  component: TreatmentsLegendComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        ModalComponent,
        MatDialogModule,
        BrowserAnimationsModule,
        ModalInfoComponent,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;height:1000px;"><sg-treatments-legend ${argsToTemplate(args)}></sg-treatments-legend></div>`,
  }),
};

export default meta;
type Story = StoryObj<TreatmentsLegendComponent>;

export const Default: Story = {
  args: {
    singleTreatments: mockSingleTreatments,
  },
};
