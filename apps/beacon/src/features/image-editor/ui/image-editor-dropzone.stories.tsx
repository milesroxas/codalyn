import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ImageEditorDropzone } from "@/features/image-editor/ui/image-editor-dropzone";

const meta = {
  title: "ImageEditor/ImageEditorDropzone",
  component: ImageEditorDropzone,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    fileInputId: "image-editor-source-file",
    dragActive: false,
    onDragEnter: fn(),
    onDragLeave: fn(),
    onDragOver: fn(),
    onDrop: fn(),
  },
  argTypes: {
    // Derived internally from `dragActive`; not a call-site control.
    state: { table: { disable: true } },
  },
} satisfies Meta<typeof ImageEditorDropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Resting state — waiting for a source image to crop. */
export const Idle: Story = {};

/** A file is being dragged over the dropzone (border + surface highlight). */
export const DragActive: Story = {
  args: { dragActive: true },
};
