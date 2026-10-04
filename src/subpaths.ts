// Components that live in a sub-path entry of the package rather than its root,
// because they need an optional peer dependency (Tiptap for the editor).
export const componentSubpaths: Record<string, string> = {
  MlRichTextEditor: 'editor',
}
