import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { FileUploadFieldComponent } from './file-upload-field.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<FileUploadFieldComponent> = {
  title: 'Components/File Upload Field',
  component: FileUploadFieldComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<sg-file-upload ${argsToTemplate(args)}></sg-file-upload>`,
  }),
};

export default meta;
type Story = StoryObj<FileUploadFieldComponent>;

const acceptedTypes = [
  { mime: 'application/zip', suffix: 'zip' },
  { mime: 'application/gzip', suffix: 'gz' },
];

export const Default: Story = {
  args: {
    uploadStatus: 'default',
    fieldLabel: 'Label',
    required: true,
    supportedTypes: acceptedTypes,
  },
};

export const NoLabel: Story = {
  args: {
    ...Default.args,
    fieldLabel: undefined,
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};

export const Running: Story = {
  args: {
    ...Default.args,
    uploadStatus: 'running',
  },
};
