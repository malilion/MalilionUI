<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MlJsonCopyEvent, MlJsonPathStyle } from '@malilion/ui'

const roles = ['frontend', 'backend', 'design', 'devops']
const users = Array.from({ length: 24 }, (_, i) => ({
  id: 1001 + i,
  name: ['Nala', 'Simba', 'Kiara', 'Kovu', 'Sarabi', 'Mufasa'][i % 6] + (i >= 6 ? ` ${Math.floor(i / 6) + 1}` : ''),
  email: `lion${i + 1}@malilion.dev`,
  role: roles[i % roles.length],
  active: i % 5 !== 0,
  joined: `2025-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
  profile: { avatar: `https://malilion.github.io/avatars/${i + 1}.png`, paws: i * 7 },
}))

const responses = {
  users: {
    status: 200,
    url: 'https://api.malilion.dev/v1/users?page=1',
    headers: { 'content-type': 'application/json', 'x-request-id': 'req_7f3a91c2' },
    data: { total: 24, page: 1, users },
  },
  order: {
    status: 201,
    url: 'https://api.malilion.dev/v1/orders',
    data: {
      id: 'ord_20261004_0042',
      createdAt: '2026-10-04T10:12:45Z',
      items: [
        { sku: 'PAW-GOLD', qty: 2, price: 349.5 },
        { sku: 'MANE-COMB', qty: 1, price: 120 },
      ],
      coupon: null,
      shipping: { method: '黑貓宅急便', address: { city: '台北市', district: '信義區', zip: '110' } },
    },
  },
  error: {
    status: 422,
    url: 'https://api.malilion.dev/v1/users',
    error: { code: 'VALIDATION_FAILED', message: '電子郵件格式不正確', fields: { email: ['必須是有效的 email'] } },
  },
}

const endpoint = ref<keyof typeof responses>('users')
const pathStyle = ref<MlJsonPathStyle>('jsonpath')
const search = ref('')
const last = ref<MlJsonCopyEvent | null>(null)
const response = computed(() => responses[endpoint.value])
</script>

<template>
  <div class="explorer">
    <div class="bar">
      <MlSegmented
        v-model="endpoint"
        size="sm"
        label="API"
        :options="[
          { value: 'users', label: 'GET /users' },
          { value: 'order', label: 'POST /orders' },
          { value: 'error', label: '422' },
        ]"
      />
      <MlSegmented
        v-model="pathStyle"
        size="sm"
        label="路徑格式"
        :options="[
          { value: 'jsonpath', label: '$.a[0].b' },
          { value: 'dot', label: 'a.0.b' },
        ]"
      />
    </div>
    <MlJsonViewer v-model:search="search" :data="response" :path-style="pathStyle" :max-height="420" label="API 回應" @copy="last = $event" />
    <p class="ml-hud-label">
      {{ last ? `已複製${last.kind === 'path' ? '路徑' : '值'}：${last.text.length > 60 ? last.text.slice(0, 60) + '…' : last.text}` : '點鍵名複製路徑、點值複製內容；方向鍵移動，c 複製值、p 複製路徑' }}
    </p>
  </div>
</template>

<style scoped>
.explorer {
  display: grid;
  gap: 12px;
  width: 100%;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
}
</style>
