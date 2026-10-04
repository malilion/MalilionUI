<template>
  <MlScratchCard tone="steel" :width="200" :height="110" cover-text="刮刮看">
    <strong>銘謝惠顧</strong>
  </MlScratchCard>
  <MlScratchCard tone="bean" :width="200" :height="110" :brush="40" :threshold="0.3">
    <MlCuteIcon name="heart" :size="44" animate="beat" />
  </MlScratchCard>
  <MlScratchCard tone="tech" :width="200" :height="110" :confetti="false">
    <strong>折價 100 元</strong>
  </MlScratchCard>
</template>
