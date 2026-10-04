// @malilion/ui/editor — the rich-text editor, built on Tiptap.
// A separate entry so Tiptap stays an optional peer dependency:
//   npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extensions
// Styles ship in @malilion/ui/style.css (or the on-demand MlRichTextEditor entry).
import type { App } from 'vue'
import MlRichTextEditor from './components/MlRichTextEditor.vue'

export { MlRichTextEditor }
export {
  defaultEditorToolbar,
  editorTools,
  normalizeEditorLink,
  editorHtml,
  type MlEditorTool,
  type MlEditorToolbarItem,
  type MlEditorStarterKitOptions,
} from './components/rich-text'

/** `app.use(MalilionEditor)` registers <MlRichTextEditor> globally. */
const MalilionEditor = {
  install(app: App) {
    app.component('MlRichTextEditor', MlRichTextEditor)
  },
}
export default MalilionEditor

declare module 'vue' {
  export interface GlobalComponents {
    MlRichTextEditor: typeof MlRichTextEditor
  }
}
