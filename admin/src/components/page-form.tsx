import { pageEditorExtensions } from '@/helpers/page-editor-extensions'
import { Button, Group, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { RichTextEditor } from '@mantine/tiptap'
import { useBlocker } from '@tanstack/react-router'
import { useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import { useRef } from 'react'
import type { ReactNode } from 'react'

export type PageFormValues = {
  url: string
  title: string
  description: string
  content: JSONContent
}

export const EMPTY_PAGE: PageFormValues = {
  url: '',
  title: '',
  description: '',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
}

const SLUG_HINT =
  'Lowercase letters, numbers and hyphens, e.g. /guides/new-players. Site sections such as /teams can’t be used.'

/** URL, title, description and rich-text content for a CMS page. Warns before leaving with unsaved changes. */
export function PageForm({
  initialValues,
  submitLabel,
  submitting,
  onSubmit,
  children,
}: {
  initialValues: PageFormValues
  submitLabel: string
  submitting: boolean
  onSubmit: (values: PageFormValues) => Promise<unknown>
  /** Extra controls rendered above the submit button. */
  children?: ReactNode
}) {
  const form = useForm<PageFormValues>({
    initialValues,
    validate: {
      url: (v) => (v.trim() ? null : 'Required'),
      title: (v) => (v.trim() ? null : 'Required'),
    },
  })

  const editor = useEditor({
    extensions: pageEditorExtensions,
    content: initialValues.content,
    onUpdate: ({ editor: e }) => form.setFieldValue('content', e.getJSON()),
  })

  const dirty = form.isDirty()
  // Set while saving, so a navigation triggered by a successful save isn't blocked.
  const saving = useRef(false)
  useBlocker({
    shouldBlockFn: () =>
      dirty &&
      !saving.current &&
      !window.confirm('You have unsaved changes. Leave anyway?'),
    enableBeforeUnload: () => dirty && !saving.current,
  })

  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        saving.current = true
        try {
          await onSubmit(values)
          form.resetDirty(values)
        } catch {
          // The API layer has already shown the error; keep the edits.
        } finally {
          saving.current = false
        }
      })}
    >
      <Stack>
        <TextInput
          label="URL"
          description={SLUG_HINT}
          placeholder="/guides/new-players"
          required
          {...form.getInputProps('url')}
        />
        <TextInput
          label="Title"
          description="Page heading and browser tab title"
          required
          maxLength={200}
          {...form.getInputProps('title')}
        />
        <Textarea
          label="Description"
          description="Shown in search results and link previews, not on the page"
          autosize
          minRows={2}
          maxLength={300}
          {...form.getInputProps('description')}
        />
        <div>
          <Text size="sm" fw={500} mb={4}>
            Content
          </Text>
          <PageEditor editor={editor} />
        </div>
        {children}
        <Group>
          <Button type="submit" loading={submitting} disabled={!dirty}>
            {submitLabel}
          </Button>
          {dirty && (
            <Text size="sm" c="dimmed">
              Unsaved changes
            </Text>
          )}
        </Group>
      </Stack>
    </form>
  )
}

function PageEditor({ editor }: { editor: ReturnType<typeof useEditor> }) {
  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={80}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.H4 />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Blockquote />
          <RichTextEditor.Hr />
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>
      <RichTextEditor.Content mih={300} />
    </RichTextEditor>
  )
}

/** Read-only rendering of a saved version, for the history view. */
export function PageContentPreview({ content }: { content: JSONContent }) {
  const editor = useEditor({
    extensions: pageEditorExtensions,
    content,
    editable: false,
  })
  return (
    <RichTextEditor editor={editor}>
      <RichTextEditor.Content />
    </RichTextEditor>
  )
}
