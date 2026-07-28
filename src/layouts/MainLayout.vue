<script setup>
import { useQuasar } from 'quasar';
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useTheme } from '@/composables/useTheme';
import { useSettingsStore } from '@/stores/settings'
import { ref } from 'vue';

const settingsStore = useSettingsStore();

const currentTab = ref('home');

const { isDark, toggleTheme } = useTheme();

const $q = useQuasar();
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header bordered class="main-header">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="settingsStore.toggleSideBar()" />

        <q-toolbar-title>Quasar App</q-toolbar-title>

        <q-tabs v-if="$q.screen.gt.md" v-model="currentTab" no-caps inline-label narrow-indicator>
          <q-route-tab name="home" icon="home" label="Home" to="/" />
          <q-route-tab name="places" icon="location_on" label="Places" to="/places" />
          <q-route-tab name="settings" icon="settings" label="Settings" to="/settings" />
          <q-route-tab name="about" icon="info" label="About" to="/about" />
        </q-tabs>

        <div class="">
          <ThemeToggle />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="settingsStore.sideBar" bordered>
      <q-toolbar>
        <q-toolbar-title>Menu</q-toolbar-title>
        <q-btn flat dense round icon="close" aria-label="Menu" @click="settingsStore.toggleSideBar()" />
      </q-toolbar>
      <q-list padding class="menu-list">
        <q-item exact clickable v-ripple to="/">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>

          <q-item-section>
            Home
          </q-item-section>
        </q-item>

        <q-item exact clickable v-ripple to="/places">
          <q-item-section avatar>
            <q-icon name="location_on" />
          </q-item-section>

          <q-item-section>
            Places
          </q-item-section>
        </q-item>

        <q-item exact clickable v-ripple to="/settings">
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>

          <q-item-section>
            Settings
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

        <q-item clickable v-ripple @click="toggleTheme()">
          <q-item-section avatar>
            <q-icon :name="isDark ? 'light_mode' : 'dark_mode'" />
          </q-item-section>

          <q-item-section v-if="isDark">
            Light Mode
          </q-item-section>

          <q-item-section v-else>
            Dark Mode
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>
    <q-footer v-if="$q.screen.lt.md" :class="isDark ? 'bg-dark text-white' : 'bg-white text-black'" bordered>
      <q-tabs v-model="currentTab" align="justify" no-caps dense outside-arrows>
        <q-route-tab name="home" icon="home" label="Home" to="/" />
        <q-route-tab name="places" icon="location_on" label="Places" to="/places" />
        <q-route-tab name="settings" icon="settings" label="Settings" to="/settings" />
        <q-route-tab name="about" icon="info" label="About" to="/about" />
      </q-tabs>
    </q-footer>

    <q-page-container>
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
:root.theme--light .main-header {
  background-color: #fff;
  color: #000;
}

:root.theme--dark .main-header {
  background-color: #1d1d1d;
  color: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>