<script setup lang="ts">
import { ref } from 'vue'

const tab = ref('home')
const chip = ref('all')
const tabs = [
  { value: 'home', label: 'Home', icon: 'home' as const },
  { value: 'explore', label: 'Explore', icon: 'compass' as const },
  { value: 'inbox', label: 'Inbox', icon: 'message' as const, badge: 3 },
  { value: 'me', label: 'Me', icon: 'user' as const },
]
const menu = [
  { label: 'Home', icon: 'home' as const, active: true },
  { label: 'Projects', icon: 'folder' as const },
  { label: 'Discover', icon: 'compass' as const },
  { label: 'Favorites', icon: 'heart' as const },
  { label: 'Settings', icon: 'settings' as const },
]
const chips = ['all', 'ui', 'data', 'layout']
</script>

<template>
  <div class="phones">
    <!-- 1. Welcome -->
    <MlPhone :width="270" label="歡迎畫面">
      <div class="welcome">
        <MlMascot pose="full" :size="210" glow />
        <h3 class="ml-metal-text">Malilion UI</h3>
        <p>Design. Develop. Roar.</p>
        <MlButton block stamp>Get Started</MlButton>
        <MlButton block variant="outline">Continue with GitHub</MlButton>
      </div>
    </MlPhone>

    <!-- 2. Menu -->
    <MlPhone :width="270" label="選單畫面">
      <MlNavBar>
        <template #left>
          <span class="brand"><MlMascot :size="30" frame="ring" title="" /> Malilion</span>
        </template>
        <template #right><button class="icon" aria-label="搜尋"><MlIcon name="search" /></button></template>
      </MlNavBar>
      <MlList>
        <MlListItem v-for="item in menu" :key="item.label" :title="item.label" :active="item.active" clickable>
          <template #leading><MlIcon :name="item.icon" /></template>
        </MlListItem>
      </MlList>
      <template #bottom>
        <div class="fab-row"><button class="fab" aria-label="新增"><MlPaw tone="current" /></button></div>
      </template>
    </MlPhone>

    <!-- 3. Explore -->
    <MlPhone :width="270" label="探索畫面">
      <MlNavBar title="Explore" subtitle="UI Components" large />
      <div class="pad">
        <MlInput size="sm" placeholder="Search components..." aria-label="搜尋元件">
          <template #prefix><MlIcon name="search" /></template>
        </MlInput>
        <div class="chips">
          <MlTag v-for="c in chips" :key="c" selectable :selected="chip === c" @update:selected="chip = c">
            {{ c === 'all' ? 'All' : c.toUpperCase() }}
          </MlTag>
        </div>
        <MlCard eyebrow="Basic" title="Buttons">
          <div class="mini"><MlButton size="sm">Primary</MlButton><MlButton size="sm" variant="outline">Ghost</MlButton></div>
        </MlCard>
        <MlCard eyebrow="Data" title="Charts">
          <MlSparkline :data="[3, 5, 4, 7, 6, 9, 11]" :width="180" />
        </MlCard>
      </div>
      <template #bottom><MlTabBar v-model="tab" :items="tabs" action-label="新增" /></template>
    </MlPhone>

    <!-- 4. Messages -->
    <MlPhone :width="270" label="訊息畫面">
      <MlNavBar title="Messages">
        <template #right><button class="icon" aria-label="搜尋"><MlIcon name="search" /></button></template>
      </MlNavBar>
      <MlList title="Today">
        <MlListItem title="Malilion Bot" subtitle="Your design is amazing!" meta="10:24" :badge="2" clickable>
          <template #leading><MlAvatar lion size="sm" status="online" /></template>
        </MlListItem>
        <MlListItem title="Figma Team" subtitle="New comments on your file" meta="09:12" clickable>
          <template #leading><MlAvatar name="Figma" size="sm" ring="tech" /></template>
        </MlListItem>
        <MlListItem title="System" subtitle="Build completed successfully" meta="08:41" clickable>
          <template #leading><MlAvatar name="SY" size="sm" ring="steel" /></template>
        </MlListItem>
      </MlList>
      <MlList title="Yesterday">
        <MlListItem title="Luna" subtitle="Let's ship it! ✨" meta="Mon" clickable>
          <template #leading><MlAvatar name="Luna" size="sm" /></template>
        </MlListItem>
      </MlList>
      <template #bottom><MlTabBar :model-value="'inbox'" :items="tabs" action-label="新增" /></template>
    </MlPhone>

    <!-- 5. Call to action -->
    <MlPhone :width="270" label="行動呼籲畫面">
      <div class="cta">
        <MlMascot pose="full" :size="230" glow />
        <h3>Create<br />Amazing<br /><span class="ml-metal-text">Together.</span></h3>
        <MlButton block stamp>Explore Components →</MlButton>
      </div>
    </MlPhone>
  </div>
</template>

<style scoped>
.phones {
  display: flex;
  gap: 22px;
  padding: 8px 4px 16px;
  overflow-x: auto;
}

.welcome,
.cta {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 18px 18px 30px;
  text-align: center;
}

.welcome h3 {
  margin: 4px 0 0;
  font-family: var(--ml-font-display);
  font-size: 26px;
}

.welcome p {
  margin: 0 0 8px;
  color: var(--ml-text-muted);
}

.cta {
  justify-items: start;
  text-align: left;
}

.cta .ml-mascot {
  justify-self: center;
}

.cta h3 {
  margin: 0 0 6px;
  font-family: var(--ml-font-display);
  font-size: 30px;
  line-height: 1.1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  background: none;
  color: var(--ml-text);
}

.icon svg {
  width: 19px;
  height: 19px;
}

.pad {
  display: grid;
  gap: 12px;
  padding: 0 14px 14px;
}

.chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.mini {
  display: flex;
  gap: 8px;
}

.fab-row {
  display: flex;
  justify-content: flex-end;
  padding: 0 18px 26px;
}

.fab {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: 0;
  border-radius: 50%;
  background: var(--ml-metal-gold);
  color: var(--ml-text-on-metal);
  box-shadow: 0 6px 18px rgb(240 173 47 / 0.45);
}

.fab .ml-paw {
  width: 24px;
  height: 24px;
}
</style>
