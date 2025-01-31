<script setup>
import { ref, computed } from 'vue'
import { Dark, date } from 'quasar';
import { storeToRefs } from 'pinia';
import { useFeaturesStore } from 'src/stores/features-store';

defineOptions({
  name: 'MainLayout'
})

const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)

function toggleDarkMode() {
  Dark.toggle();
};

const featuresStore = useFeaturesStore();

const { searchQuery, features, map, featureRef } = storeToRefs(featuresStore);

const filterdFeatures = computed(() => {
  if (searchQuery.value) {
    return features.value.filter(feature =>
      feature.name.includes(searchQuery.value) ||
      feature.description.includes(searchQuery.value)
    )
  }
  return features.value
})

function flyToMarker(coordinates) {
  map.value.flyTo(coordinates, 8);
};

function togglePopup(id) {
  const featureIndex = features.value.findIndex((marker) => marker.id === id)
  featureRef.value[featureIndex].togglePopup();
}

</script>


<template>
  <div class="q-pa-md">
    <q-layout view="hHh Lpr lff" class="shadow-2 rounded-borders">
      <q-header elevated>
        <q-toolbar>
          <q-btn flat dense round icon="menu" aria-label="Menu" @click="leftDrawerOpen = !leftDrawerOpen" />

          <q-toolbar-title>
            <q-btn flat to="/">Vue GIS</q-btn>
          </q-toolbar-title>

          <q-btn flat @click="rightDrawerOpen = !rightDrawerOpen" round dense icon="menu" />
        </q-toolbar>
      </q-header>

      <q-drawer v-model="leftDrawerOpen" overlay bordered :width="300" :breakpoint="500">
        <q-list class="q-py-md">
          <q-item exact clickable v-ripple to="/">
            <q-item-section avatar>
              <q-icon name="home" />
            </q-item-section>

            <q-item-section>
              Home
            </q-item-section>
          </q-item>

          <q-item exact clickable v-ripple to="/data">
            <q-item-section avatar>
              <q-icon name="menu" />
            </q-item-section>

            <q-item-section>
              Data
            </q-item-section>
          </q-item>

          <q-item exact clickable v-ripple to="/about">
            <q-item-section avatar>
              <q-icon name="info" />
            </q-item-section>

            <q-item-section>
              About
            </q-item-section>
          </q-item>

          <q-item v-if="!Dark.isActive" clickable v-ripple @click="toggleDarkMode">
            <q-item-section avatar>
              <q-icon name="dark_mode" />
            </q-item-section>

            <q-item-section>
              Dark Mode
            </q-item-section>
          </q-item>

          <q-item v-else clickable v-ripple @click="toggleDarkMode">
            <q-item-section avatar>
              <q-icon name="light_mode" />
            </q-item-section>

            <q-item-section>
              Light Mode
            </q-item-section>
          </q-item>
        </q-list>

        <div class="q-mini-drawer-hide absolute" style="top: 200px; left: 280px">
          <q-btn dense round unelevated color="primary" icon="chevron_left" @click="leftDrawerOpen = !leftDrawerOpen" />
        </div>
      </q-drawer>

      <q-drawer side="right" v-model="rightDrawerOpen" bordered :width="300" :breakpoint="500" overlay>
        <q-scroll-area class="fit">
          <div class="q-pa-lg q-gutter-md">
            <div class="h4">
              Data
            </div>
            <q-input bottom-slots v-model="searchQuery" label="Search" counter maxlength="12" dense>
              <template v-slot:append>
                <q-icon v-if="searchQuery !== ''" name="close" @click="searchQuery = ''" class="cursor-pointer" />
                <q-icon name="search" />
              </template>

              <template v-slot:hint>
                Search By Feature Name or Description
              </template>

            </q-input>
            <q-list bordered padding class="rounded-borders" style="max-width: 450px">
              <q-item v-for="feature in filterdFeatures" :key="feature.id">
                <q-item-section>
                  <q-item-label lines="1">{{ feature.name }}</q-item-label>
                  <q-item-label caption>{{ date.formatDate(feature.dateAdded, 'DD MMMM YYYY') }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn size="sm" icon="flight" color="green" @click="flyToMarker(feature.coordinates)" />
                </q-item-section>
                <q-item-section side>
                  <q-btn size="sm" icon="info" color="green" @click="togglePopup(feature.id)" />
                </q-item-section>
              </q-item>
              <q-item v-if="features.length == 0">No Data Found</q-item>
            </q-list>
          </div>
        </q-scroll-area>

        <div class="q-mini-drawer-hide absolute" style="top: 280px; right: 280px">
          <q-btn dense round unelevated color="primary" icon="chevron_right"
            @click="rightDrawerOpen = !rightDrawerOpen" />
        </div>
      </q-drawer>

      <q-page-container>
        <router-view />
      </q-page-container>
    </q-layout>
  </div>
</template>


<style lang="sass" scoped>
.form-card
  width: 350px
  max-width: 80vw
  margin-right: 50px
</style>
