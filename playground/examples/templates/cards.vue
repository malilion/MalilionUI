<script setup lang="ts">
import { ref } from 'vue'

const following = ref(false)
const perks = ['All components', 'Premium templates', 'Figma design files', 'Commercial use']
</script>

<template>
  <div class="cards">
    <!-- Profile -->
    <MlCard rivets>
      <div class="profile">
        <MlMascot frame="ring" :size="64" />
        <div class="who">
          <strong>Malilion <MlPaw /></strong>
          <span>Design. Develop. Roar.</span>
        </div>
        <MlButton size="sm" :variant="following ? 'outline' : 'primary'" stamp @click="following = !following">
          {{ following ? 'Following' : 'Follow' }}
        </MlButton>
      </div>
      <div class="numbers">
        <div><b>128</b><span>Projects</span></div>
        <div><b>{{ following ? '2.9K' : '2.8K' }}</b><span>Followers</span></div>
        <div><b>320</b><span>Following</span></div>
      </div>
    </MlCard>

    <!-- Pricing -->
    <MlCard variant="gold" eyebrow="Pricing">
      <template #actions><MlBadge solid paw>Most Popular</MlBadge></template>
      <h3 class="plan">Pro Plan</h3>
      <p class="muted">For professional teams. Build faster with premium components.</p>
      <p class="price"><span>$</span>19<small>/month</small></p>
      <ul class="perks">
        <li v-for="perk in perks" :key="perk"><MlCheckbox :model-value="true" paw :label="perk" /></li>
      </ul>
      <template #footer>
        <MlButton block stamp>Get Started →</MlButton>
      </template>
    </MlCard>

    <!-- Empty -->
    <MlCard>
      <MlEmpty title="No Data Yet" description="Let this little lion take a nap… New things are coming soon!">
        <MlButton size="sm">Create New</MlButton>
      </MlEmpty>
    </MlCard>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 18px;
  align-items: start;
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.who {
  display: grid;
  flex: 1;
  min-width: 0;
}

.who strong {
  color: var(--ml-text);
  font-family: var(--ml-font-display);
  font-size: 1.05rem;
}

.who strong .ml-paw {
  color: var(--ml-accent);
}

.numbers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 18px;
  text-align: center;
}

.numbers b {
  display: block;
  color: var(--ml-text);
  font-family: var(--ml-font-display);
  font-size: 1.2rem;
}

.numbers span,
.muted {
  color: var(--ml-text-dim);
  font-size: 12px;
}

.plan {
  margin: 0;
  color: var(--ml-text);
  font-family: var(--ml-font-display);
  font-size: 1.4rem;
}

.muted {
  margin: 4px 0 0;
}

.price {
  margin: 14px 0;
  font-family: var(--ml-font-display);
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.price,
.price span {
  background: var(--ml-metal-gold);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.price span {
  font-size: 1.4rem;
  vertical-align: top;
}

.price small {
  color: var(--ml-text-dim);
  -webkit-text-fill-color: var(--ml-text-dim);
  font-family: var(--ml-font-body);
  font-size: 0.9rem;
  font-weight: 400;
}

.perks {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
