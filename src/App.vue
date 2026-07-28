<script setup>
import { watch } from 'vue'
import { useQuasar } from 'quasar'
import "leaflet"
import "leaflet/dist/leaflet.css"
import 'leaflet-geosearch/dist/geosearch.css';
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "leaflet/dist/leaflet.css";
import 'leaflet.fullscreen'
import 'leaflet.fullscreen/dist/Control.FullScreen.css'
import L from "leaflet";

// Fix Vite Leaflet Marker Icons
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
L.Icon.Default.imagePath = "";

import { useTheme } from './composables/useTheme'

const $q = useQuasar()
const { isDark } = useTheme()

watch(() => isDark.value, val => {
  $q.dark.set(val)
}, { immediate: true })
</script>

<template>
  <router-view />
</template>