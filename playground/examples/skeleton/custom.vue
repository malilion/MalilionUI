<template>
  <div class="grid">
    <MlCard v-for="n in 3" :key="n">
      <MlSkeleton>
        <template #template>
          <div class="card">
            <MlSkeletonItem variant="image" />
            <MlSkeletonItem variant="title" width="60%" />
            <MlSkeletonItem />
            <MlSkeletonItem width="80%" />
            <MlSkeletonItem variant="button" />
          </div>
        </template>
      </MlSkeleton>
    </MlCard>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  display: grid;
  gap: 12px;
  width: 100%;
}
</style>
