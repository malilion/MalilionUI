<script setup lang="ts">
const slides = [
  { title: 'Night Pride', sub: '暗色主題，金屬與獅鬃的光澤', bg: 'radial-gradient(80% 120% at 20% 0%, rgb(240 173 47 / 0.35), transparent 60%), #0b0e14' },
  { title: 'Daylight Titanium', sub: '淺色主題，拋光鈦金屬', bg: 'linear-gradient(135deg, #e9edf2, #9ea7b5)', light: true },
  { title: 'Circuit Cyan', sub: '科技色，獅子眼裡的電光', bg: 'radial-gradient(80% 120% at 80% 100%, rgb(62 238 208 / 0.35), transparent 60%), #0b0e14' },
  { title: 'Toe Bean Pink', sub: '肉球粉，少量使用的可愛', bg: 'radial-gradient(80% 120% at 50% 0%, rgb(255 143 168 / 0.4), transparent 60%), #151a24' },
]
</script>

<template>
  <MlCarousel :items="slides" :autoplay="4000" :height="240" label="主題展示">
    <template #default="{ item }">
      <div :class="['slide', { 'slide--light': item.light }]" :style="{ background: item.bg }">
        <p class="eyebrow">MALILION UI</p>
        <h3>{{ item.title }}</h3>
        <p>{{ item.sub }}</p>
      </div>
    </template>
  </MlCarousel>
</template>

<style scoped>
.slide {
  display: grid;
  align-content: center;
  height: 100%;
  padding: 0 64px;
  color: #efe8d8;
}

.slide--light {
  color: #141821;
}

.slide--light .eyebrow {
  color: #7c4e0b;
}

h3 {
  margin: 4px 0;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-2xl);
}

p {
  margin: 0;
  opacity: 0.8;
}

.eyebrow {
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: var(--ml-tracking-hud);
  color: var(--ml-gold-300);
}
</style>
