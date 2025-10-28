import {
  argsToTemplate,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { ModalComponent } from './modal.component';
import { ModalInfoComponent } from '../modal-info-box/modal-info.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

const meta: Meta<ModalComponent> = {
  title: 'Components/Modal',
  component: ModalComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        MatDialogModule,
        BrowserAnimationsModule,
        ModalInfoComponent,
        MatFormFieldModule,
        MatInputModule,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<ModalComponent>;

const containerStyle = `style="background-color: gray;
    height: 400px;
    align-content: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;"`;

const bigContainerStyle = `style="background-color: gray;
    height: 800px;
    align-content: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;"`;

export const Default: Story = {
  args: {
    title: 'Hello, I am a Modal',
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-modal ${argsToTemplate(args)}>
        <div modalBodyContent>This is the default behavior of a modal,
        without providing any other configurations besides the title.</div>
      </sg-modal><div>`,
  }),
};

export const Dialogs: Story = {
  args: {
    title: 'Name your thing',
    showClose: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
*When to use*: When asking user for input (like naming new elements).

This modal should have:
- A primary CTA
- A secondary cancel action (closes the modal)
- Does not have an X to close the modal
- Padding on the body
- The form and fields without adding additional paddings

      `,
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-modal ${argsToTemplate(args)}>
        <div modalBodyContent>
        <div style='font-weight: 500; margin-bottom: 4px'>Label <span style='color:#D50000'>*</span></div>
        <mat-form-field appearance='outline' subscriptSizing='dynamic' style='width:100%'>
          <input matInput>
        </mat-form-field>
        </div>
      </sg-modal><div>`,
  }),
};

export const DeleteModal: Story = {
  args: {
    title: 'Delete Something',
    primaryButtonVariant: 'negative',
    primaryButtonText: 'Delete',
    showBorders: false,
    shortHeader: true,
    showClose: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
*When to use*: When asking user confirmation to delete something

This modal should have:
- No borders
- Padding on the body
- Primary CTA in negative/red variant
- Does not have an X to close the modal
- A secondary cancel action (closes the modal)
- A shortHeader to avoid bigger padding between title and body

For this specific modal configuration, use \`DeleteDialogComponent\`
      `,
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-modal ${argsToTemplate(args)}>
        <div modalBodyContent>Are you sure you want to delete this?</div>
      </sg-modal><div>`,
  }),
};

export const DecisionModal: Story = {
  args: {
    title: 'Are you sure?',
    primaryButtonText: 'Continue',
    showBorders: false,
    shortHeader: true,
    showClose: false,
  },
  parameters: {
    docs: {
      description: {
        story: `
*When to use*: When asking user confirmation to follow an action

This modal should have:
- No borders
- Padding on the body
- Primary CTA in default color
- Does not have an X to close the modal
- A secondary cancel action (closes the modal)
- A shortHeader to avoid bigger padding between title and body
      `,
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-modal ${argsToTemplate(args)}>
        <div modalBodyContent>A message that informs the users about a situation that requires acknowledgement</div>
      </sg-modal><div>`,
  }),
};

export const Large: Story = {
  args: {
    title: 'Large Modal',
    width: 'large',
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-modal ${argsToTemplate(args)}>
        <div modalBodyContent>
        <div>Use this modal sizing to display bigger modals, that include more data or summaries.</div>
          <ul>
            <li>Larger Modals should always include borders.</li>
            <li>Depending on the use case, it might or may not include a footer with actions</li>
            <li>When displaying a secondary action on the footer, do not include a close button</li>
            <li>When not displaying footer actions, always show the close (X) button</li>
          </ul>
         <div>Check the design system for specific implementations of this type of modal</div>
        </div>
      </sg-modal><div>`,
  }),
};

export const LeadingIcon: Story = {
  args: {
    title: 'Modal with an icon',
    leadingIcon: 'assignment',
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
          <sg-modal ${argsToTemplate(args)}>
                <div modalBodyContent>Here we show a leading Icon.</div>
          </sg-modal><div>`,
  }),
};
export const Tooltip: Story = {
  args: {
    title: 'Modal with a tooltip',
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
          <sg-modal ${argsToTemplate(args)} >

                <div modalBodyContent>Here we show a tooltip on the modal header. Useful to provide info.</div>

          </sg-modal><div>`,
  }),
};

export const WithoutFooter: Story = {
  args: {
    ...Default,
    hasHeader: true,
    hasFooter: false,
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
          <sg-modal ${argsToTemplate(args)}>
          <div modalBodyContent>Standard modal content</div>
          </sg-modal><div>`,
  }),
};

export const WithProgressElements: Story = {
  args: {
    ...Default,
    hasHeader: true,
    hasFooter: false,
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
          <sg-modal ${argsToTemplate(args)}>
          <sg-modal-info message='Hello'></sg-modal-info>
          <div modalBodyContent>Standard modal content</div>
          </sg-modal><div>`,
  }),
};

export const ProgressBlurb: Story = {
  args: {
    ...Default,
    hasHeader: true,
    hasFooter: false,
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
          <sg-modal ${argsToTemplate(args)}>
          <div modalBodyContent style='padding:10px;background-color: #f6f6f6;'>Estimated time remaining: 3 minutes</div>

          </sg-modal><div>`,
  }),
};

export const WithoutHeader: Story = {
  args: {
    ...Default,
    hasFooter: true,
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
          <sg-modal ${argsToTemplate(args)}>
          <div modalBodyContent>Standard modal content</div>
          </sg-modal><div>`,
  }),
};

export const CenteredFooter: Story = {
  args: {
    ...Default,
    title: 'This has a centered footer',
    centerFooter: true,
  },
  render: (args) => ({
    props: args,
    template: `<div ${containerStyle}>
      <sg-modal ${argsToTemplate(args)}>
        <div modalBodyContent>Are you sure you want to delete this?</div>
      </sg-modal><div>`,
  }),
};

export const WithScrollableContent: Story = {
  args: {
    ...Default,
    hasFooter: true,
    scrollableContent: true,
  },
  render: (args) => ({
    props: args,
    template: `<div ${bigContainerStyle}>
          <sg-modal ${argsToTemplate(args)}>
          <div style='height=400px' modalBodyContent>Hoodie letterpress succulents iceland literally af heirloom occupy
          chia health goth forage quinoa vibecession pork belly try-hard. Narwhal mustache bushwick,
          kinfolk glossier coloring book praxis succulents. Migas pour-over VHS truffaut succulents
          irony man braid street art. Poutine biodiesel locavore fashion axe austin godard same
          lumbersexual, post-ironic beard hot chicken church-key. Hashtag knausgaard 90's leggings
          forage prism, kitsch echo park jawn. Activated charcoal crucifix slow-carb gluten-free,
          adaptogen irony bruh williamsburg meh pitchfork jianbing pour-over. Shabby chic semiotics
          raw denim umami craft beer tonx.

          Marxism typewriter quinoa crucifix sriracha tilde bitters enamel pin williamsburg fixie.
          Scenester iceland raw denim celiac bespoke salvia hexagon williamsburg blog green juice shaman
          portland JOMO gorpcore. DIY actually meggings brunch palo santo air plant. Fashion axe lo-fi lomo,
          intelligentsia enamel pin biodiesel kitsch chambray chicharrones letterpress fingerstache roof
          party cold-pressed kombucha.

          Jawn craft beer gatekeep, narwhal portland echo park hella lo-fi migas etsy hammock normcore
          meditation. Air plant chartreuse hot chicken trust fund neutral milk hotel. JOMO pok pok church-key
          before they sold out DIY listicle vegan selvage vape gluten-free raw denim migas master cleanse
          portland tilde. Gentrify slow-carb forage blackbird spyplane beard. Neutral milk hotel hoodie pug
          vape austin keffiyeh, taiyaki migas scenester asymmetrical.

          Cupping organic neutra DSA, pour-over knausgaard shabby chic poke af church-key. Truffaut drinking
          vinegar adaptogen, yuccie subway tile freegan iceland offal hella skateboard. Chia tonx hell of,
          tofu tousled pop-up deep v yuccie cred scenester kale chips farm-to-table sustainable. Williamsburg
           cray fingerstache bicycle rights farm-to-table tattooed kombucha fanny pack tbh.</div>
          </sg-modal><div>`,
  }),
};

export const WithForm: Story = {
  args: {
    ...Default,
    hasFooter: true,
    scrollableContent: false,
  },
  render: (args) => ({
    props: args,
    template: `<div ${bigContainerStyle}>
          <sg-modal ${argsToTemplate(args)}>
          <div modalBodyContent>
          <h3>Base Map</h3>
          <div style='padding:10px'><input name='example' type='radio'>Choice 1</div>
          <div style='padding:10px'><input name='example' type='radio'>Choice 2</div>
          <div style='padding:10px'><input name='example' type='radio'>Choice 3</div>
          <div style='padding:10px'><input name='example' type='radio'>Choice 4</div>
          <div style='padding:10px'><input name='example' type='radio'>Choice 5</div>
          </div></sg-modal><div>`,
  }),
};
