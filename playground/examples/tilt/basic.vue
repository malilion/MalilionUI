<script setup lang="ts">
import { lionAvatarUrl } from '@malilion/ui'
</script>

<template>
  <div class="row">
    <MlTilt>
      <MlCard variant="gold" eyebrow="Member card" title="Alpha Pass" class="card">
        <div class="pass">
          <img :src="lionAvatarUrl" alt="" width="64" height="64" />
          <div>
            <p class="ml-hud-label">No. 0001</p>
            <strong>碼力獅 Malilion</strong>
          </div>
        </div>
      </MlCard>
    </MlTilt>
    <MlTilt :max="18" :scale="1.05">
      <MlCard variant="tech" eyebrow="max 18°" title="更誇張的傾斜" class="card">滑鼠移上來，金屬反光會跟著游標走。</MlCard>
    </MlTilt>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.card {
  width: 260px;
}

.pass {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pass img {
  border-radius: 50%;
}

.pass p {
  margin: 0;
}
</style>
