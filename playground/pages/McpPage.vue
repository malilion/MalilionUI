<script setup lang="ts">
import CodeBlock from '../components/CodeBlock.vue'
import PageHeader from '../components/PageHeader.vue'

const claude = `claude mcp add malilion-ui -- npx -y -p @malilion/ui malilion-ui-mcp`
const json = `{
  "mcpServers": {
    "malilion-ui": {
      "command": "npx",
      "args": ["-y", "-p", "@malilion/ui", "malilion-ui-mcp"]
    }
  }
}`
const tools = [
  { name: 'list_components', desc: '列出全部元件與頁面（英文＋中文名稱、一句話說明），可依群組篩選。' },
  { name: 'search_components', desc: '用中文或英文關鍵字找元件，例如「日期」、「toast」、「表格」。' },
  { name: 'get_component', desc: 'props（型別、預設值）、events、slots 與 import 寫法。framework: "react" 會換成 React 的名稱與型別。' },
  { name: 'get_example', desc: '官網範例的原始碼；不指定範例就列出可用的。' },
  { name: 'get_tokens', desc: '--ml-* 設計代幣（色盤、金屬漸層、間距、字級），可依名稱與主題篩選。' },
  { name: 'get_setup', desc: 'vue、react、nuxt、純 css、按需載入的安裝與設定方式。' },
]
const prompt = `用 malilion-ui 做一個登入表單：email、密碼、記住我，下面一顆送出按鈕。`
</script>

<template>
  <article>
    <PageHeader
      eyebrow="Getting started / 開始"
      title="AI agents (MCP)"
      zh="AI Agent 與 MCP"
      desc="@malilion/ui 內建 MCP server：Claude Code、Cursor、VS Code、Claude Desktop 等工具可以直接查真實的 props、範例與設計代幣，不用靠猜，也不會寫出不存在的屬性。不需要裝進專案，沒有額外依賴。"
    />

    <section class="block">
      <h2>Claude Code</h2>
      <CodeBlock :code="claude" lang="bash" filename="terminal" />
    </section>

    <section class="block">
      <h2>其他工具</h2>
      <p class="note">Cursor、VS Code、Claude Desktop 等，在 MCP 設定檔裡加入同一個指令：</p>
      <CodeBlock :code="json" lang="json" filename="mcp.json" />
    </section>

    <section class="block">
      <h2>提供的工具</h2>
      <dl class="tools">
        <template v-for="t in tools" :key="t.name">
          <dt><code>{{ t.name }}</code></dt>
          <dd>{{ t.desc }}</dd>
        </template>
      </dl>
    </section>

    <section class="block">
      <h2>實際使用</h2>
      <p class="note">接上之後直接用自然語言下指令，agent 會先查 <code>get_component</code> 再寫程式：</p>
      <CodeBlock :code="prompt" lang="text" filename="prompt" />
      <p class="note">資料來源就是這個網站的元件頁（props、events、slots、範例），建置時自動產生，所以永遠和元件同步。在這個 repo 裡開 Claude Code 會透過 <code>.mcp.json</code> 自動啟用。</p>
    </section>
  </article>
</template>

<style scoped>
.block {
  display: grid;
  gap: 14px;
  margin-top: 40px;
}

.block h2 {
  margin: 0;
  font-family: var(--ml-font-display);
}

.note {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.tools {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 10px 20px;
  margin: 0;
  padding: 20px 24px;
  background: var(--ml-brushed), var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.tools dt,
.tools dd {
  margin: 0;
}

@media (max-width: 640px) {
  .tools {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .tools dd {
    margin-bottom: 10px;
  }
}
</style>
