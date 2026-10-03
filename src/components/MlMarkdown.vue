<script lang="ts">
import { Fragment, computed, defineComponent, h, withMemo, type PropType, type SlotsType, type VNode, type VNodeChild } from 'vue'
import MlCodeBlock from './MlCodeBlock.vue'
import MlPaw from './MlPaw.vue'
import { useLocale } from '../locale'
import {
  caretTarget,
  containsBlock,
  createMarkdownParser,
  headingIds,
  headingKey,
  inlineText,
  isPlainLang,
  type MdBlock,
  type MdHeading,
  type MdInline,
  type MlMarkdownCodeSlot,
  type MlMarkdownImageSlot,
  type MlMarkdownLinkSlot,
} from '../markdown'

/**
 * Markdown rendered as real elements (never v-html), built for AI chat
 * streaming. Fences go through MlCodeBlock, so they get colouring and copy.
 */
export default defineComponent({
  name: 'MlMarkdown',
  props: {
    /** Markdown source. */
    source: { type: String, default: '' },
    /** Still arriving: finish the open tail gracefully and show a caret. */
    streaming: Boolean,
    /** Caret shape while streaming. */
    caret: { type: String as PropType<'bar' | 'paw'>, default: 'bar' },
    /** Single newlines become line breaks (chat-style). */
    breaks: Boolean,
    /** Line numbers on code blocks. */
    lineNumbers: Boolean,
    /** Copy button on code blocks. */
    copyable: { type: Boolean, default: true },
    /** target for external links; '' keeps them in the same tab. */
    linkTarget: { type: String, default: '_blank' },
    /** Give headings ids (from their text) and a # link. */
    headingAnchors: Boolean,
    /** Prepended to every heading id. */
    anchorPrefix: { type: String, default: '' },
  },
  emits: {
    /** A code block's copy button was used. */
    copy: (_code: string) => true,
  },
  slots: Object as SlotsType<{
    code: MlMarkdownCodeSlot
    link: MlMarkdownLinkSlot
    image: MlMarkdownImageSlot
  }>,
  setup(props, { emit, slots }) {
    const loc = useLocale()
    const parse = createMarkdownParser()
    const blocks = computed(() => parse(props.source, { streaming: props.streaming, breaks: props.breaks }))
    const ids = computed(() => (props.headingAnchors ? headingIds(blocks.value, props.anchorPrefix) : new Map<MdHeading, string>()))
    const memo: VNode[] = []

    const caretNode = () =>
      h(
        'span',
        { class: ['ml-markdown__caret', `ml-markdown__caret--${props.caret}`], role: 'img', 'aria-label': loc.value.markdown.streaming },
        props.caret === 'paw' ? [h(MlPaw, { tone: 'current' })] : undefined,
      )

    function inlines(nodes: MdInline[]): VNodeChild[] {
      return nodes.map((n) => {
        switch (n.type) {
          case 'text':
            return n.text
          case 'strong':
          case 'em':
          case 'del':
            return h(n.type, inlines(n.children))
          case 'code':
            return h('code', { class: 'ml-markdown__code' }, n.text)
          case 'br':
            return h('br')
          case 'link': {
            if (slots.link) return h(Fragment, slots.link({ href: n.href, title: n.title, external: n.external, text: inlineText(n.children) }))
            const blank = n.external && props.linkTarget
            return h(
              'a',
              {
                class: 'ml-markdown__link',
                href: n.href,
                title: n.title,
                target: blank ? props.linkTarget : undefined,
                rel: n.external ? 'noopener noreferrer' : undefined,
              },
              inlines(n.children),
            )
          }
          case 'image':
            if (slots.image) return h(Fragment, slots.image({ src: n.src, alt: n.alt, title: n.title }))
            return h('img', { class: 'ml-markdown__img', src: n.src, alt: n.alt, title: n.title, loading: 'lazy' })
        }
      })
    }

    function block(b: MdBlock, caretAt: MdBlock | null, tight = false): VNode {
      const caret = b === caretAt ? [caretNode()] : []
      switch (b.type) {
        case 'heading': {
          const id = ids.value.get(b)
          return h(`h${b.level}`, { class: ['ml-markdown__h', `ml-markdown__h--${b.level}`], id }, [
            ...inlines(b.children),
            id ? h('a', { class: 'ml-markdown__anchor', href: `#${id}`, 'aria-hidden': 'true', tabindex: -1 }, '#') : null,
            ...caret,
          ])
        }
        case 'paragraph':
          return tight ? h(Fragment, [...inlines(b.children), ...caret]) : h('p', { class: 'ml-markdown__p' }, [...inlines(b.children), ...caret])
        case 'code':
          if (slots.code) return h(Fragment, slots.code({ code: b.code, lang: b.lang, closed: b.closed }))
          return h(MlCodeBlock, {
            code: b.code,
            lang: b.lang,
            plain: isPlainLang(b.lang),
            lineNumbers: props.lineNumbers,
            copyable: props.copyable,
            onCopy: (code: string) => emit('copy', code),
          })
        case 'blockquote':
          return h('blockquote', { class: 'ml-markdown__quote' }, b.children.map((c) => block(c, caretAt)))
        case 'list':
          return h(
            b.ordered ? 'ol' : 'ul',
            { class: ['ml-markdown__list', { 'ml-markdown__list--loose': b.loose }], start: b.ordered && b.start !== 1 ? b.start : undefined },
            b.items.map((item) =>
              h('li', { class: ['ml-markdown__li', { 'ml-markdown__li--task': item.task }] }, [
                item.task ? h('input', { class: 'ml-markdown__check', type: 'checkbox', checked: item.checked, disabled: true }) : null,
                ...item.children.map((c) => block(c, caretAt, !b.loose)),
              ]),
            ),
          )
        case 'table':
          return h('div', { class: 'ml-markdown__table-wrap' }, [
            h('table', { class: 'ml-markdown__table' }, [
              h('thead', [h('tr', b.head.map((cell, i) => h('th', { class: b.align[i] ? `ml-markdown__cell--${b.align[i]}` : undefined }, inlines(cell))))]),
              b.rows.length
                ? h(
                    'tbody',
                    b.rows.map((row) => h('tr', row.map((cell, i) => h('td', { class: b.align[i] ? `ml-markdown__cell--${b.align[i]}` : undefined }, inlines(cell))))),
                  )
                : null,
            ]),
          ])
        case 'hr':
          return h('hr', { class: 'ml-markdown__hr' })
      }
    }

    return () => {
      const list = blocks.value
      const caretAt = props.streaming ? caretTarget(list) : null
      // Custom slots may read any reactive state, so only plain renders are memoised.
      const memoOn = !slots.code && !slots.link && !slots.image
      const children: VNodeChild[] = list.map((b, i) => {
        const owns = containsBlock(b, caretAt)
        const render = () => block(b, owns ? caretAt : null)
        if (!memoOn) return render()
        const deps = [b, owns, headingKey(b, ids.value), props.linkTarget, props.lineNumbers, props.copyable, props.caret, loc.value]
        return withMemo(deps, render, memo, i)
      })
      if (props.streaming && !caretAt) children.push(caretNode())
      return h(
        'div',
        { class: ['ml-markdown', { 'ml-markdown--streaming': props.streaming }], 'aria-busy': props.streaming ? 'true' : undefined },
        children,
      )
    }
  },
})
</script>
