<script setup lang="ts">
import { ref } from 'vue'
import { toast, type MlIndexBarItem } from '@malilion/ui'

// No readings needed: names are filed by the browser's 注音 collation.
const contacts: MlIndexBarItem[] = [
  '陳大文', '林美玲', '黃志明', '張雅婷', '李建宏', '王小明', '吳佩珊', '劉家豪', '蔡淑芬', '楊俊傑',
  '許文欣', '鄭宇翔', '謝怡君', '郭冠廷', '洪詩涵', '曾國華', '邱靜宜', '廖柏翰', '賴品妤', '周宜庭',
  '徐承恩', '蘇念慈', '葉書豪', '莊凱翔', '呂欣怡', '江雅雯', '何志偉', '蕭明哲', '羅宜蓁', '高瑞庭',
  '潘冠宇', '朱婉婷', '彭立安', '胡家瑋', '沈佳穎', '戴文彬', '范思妤', '宋芷晴', '安以樂', '歐陽晴',
  'Leo', 'Nala', 'Simba', '7-ELEVEN',
].map((label, i) => ({ label, desc: `09${String(12345678 + i * 7919).slice(0, 2)}-${String(100 + i * 37).slice(-3)}-${String(400 + i * 53).slice(-3)}` }))

const active = ref('')
</script>

<template>
  <div class="wrap">
    <MlIndexBar :items="contacts" :height="440" @change="active = $event" @item-click="(c) => toast.info(`撥給 ${c.label}`)" />
    <p class="note">目前：{{ active || '—' }}（在右側索引上按住上下拖曳試試）</p>
  </div>
</template>

<style scoped>
.wrap {
  max-width: 380px;
}
.note {
  margin: 8px 0 0;
  color: var(--ml-text-dim);
  font-size: 0.8125rem;
}
</style>
