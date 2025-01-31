<script setup>
import { onMounted, toRaw, ref } from 'vue';
import { Notify, uid } from 'quasar';
import { storeToRefs } from 'pinia';
import "leaflet/dist/leaflet.css"
import * as L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { useFeaturesStore } from 'src/stores/features-store';

// Source: https://cescobaz.com/2023/06/14/setup-leaflet-with-svelte-and-vite/
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const featuresStore = useFeaturesStore();

const { features, map, featureRef } = storeToRefs(featuresStore);

const formCard = ref(false);

const name = ref('');
const description = ref('');
const latitude = ref('');
const longitude = ref('');


function loadFeatures() {
  let allFeatures = []

  features.value.forEach((marker) => {
    allFeatures.push(
      L.marker([marker.coordinates.lat, marker.coordinates.lng])
        .bindTooltip(marker.name)
        .bindPopup(marker.description, { autoClose: false, closeOnClick: false, closeButton: true, closeOnEscapeKey: true })
        .addTo(toRaw(map.value)) // https://stackoverflow.com/a/66693709
    )
  })
  featureRef.value = allFeatures
}

function flyToMarker(coordinates) {
  map.value.flyTo(coordinates, 8);
};

function togglePopup(id) {
  const featureIndex = features.value.findIndex((marker) => marker.id === id)
  featureRef.value[featureIndex].togglePopup();
}

function handleSubmit() {
  try {
    featuresStore.addFeature(
      {
        id: uid(),
        name: name.value,
        description: description.value,
        coordinates: {
          lat: latitude.value,
          lng: longitude.value
        },
        dateAdded: Date.now()
      }
    )
    map.value.flyTo([latitude.value, longitude.value], 4)
    name.value = '';
    description.value = '';
    latitude.value = '';
    longitude.value = '';
    loadFeatures()
    Notify.create({
      message: 'Feature Added Successfully',
      type: "positive",
      actions: [
        { icon: 'close', color: 'white', round: true, }
      ]
    })
    formCard.value = false;
  } catch (error) {
    Notify.create({
      message: error.message,
      type: "negative",
      actions: [
        { icon: 'close', color: 'white', round: true, }
      ]
    })
  }
}

function onReset() {
  name.value = '';
  description.value = '';
  latitude.value = '';
  longitude.value = '';
}

onMounted(() => {

  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  })

  const cartoDBDarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  })

  map.value = L.map(
    'map',
    { maxZoom: 12, minZoom: 2, zoomControl: true, zoom: 1, layers: [osm, cartoDBDarkMatter], markerZoomAnimation: true }
  ).setView([0, 0], 2)

  const baseMaps = {
    "OpenStreetMap": osm,
    "CartoDB.DarkMatter": cartoDBDarkMatter,
  };

  const layerControl = L.control.layers(baseMaps).addTo(map.value);

  L.Icon.Default.prototype.options.iconUrl = markerIconUrl;
  L.Icon.Default.prototype.options.iconRetinaUrl = markerIconRetinaUrl;
  L.Icon.Default.prototype.options.shadowUrl = markerShadowUrl;
  L.Icon.Default.imagePath = ""; // necessary to avoid Leaflet adds some prefix to image path.

  loadFeatures()

  const searchControl = new GeoSearchControl({
    provider: new OpenStreetMapProvider(),
    style: 'button',
  });

  map.value.addControl(searchControl);
  L.control.locate().addTo(map.value);
  L.control.fullscreen({ position: 'topright' }).addTo(map.value);

  map.value.addEventListener('click', function (e) {
    latitude.value = e.latlng.lat.toFixed(6);
    longitude.value = e.latlng.lng.toFixed(6);
  })
})


</script>


<template>
  <q-page :class="$q.dark.isActive ? 'text-white' : 'text-dark'">
    <div>
      <div id="map" style="height:80vh; width: 80vw;"></div>
    </div>
    <q-page-sticky position="bottom-right" :offset="[30, 30]">
      <q-btn fab icon="add" color="primary" @click="formCard = true" />
    </q-page-sticky>
    <q-dialog v-model="formCard" position="right" persistent seamless>
      <q-card flat bordered class="form-card">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Add Feature</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>


        <q-card-section>
          <q-form @submit="handleSubmit" @reset="onReset" class="q-gutter-md">
            <q-input filled v-model="name" label="Feature name *" hint="Shop 1" lazy-rules
              :rules="[val => val && val.length > 0 || 'Please type something']" />

            <q-input filled type="textarea" v-model="description" label="Feature description *" hint="Shop 1 Description"
              lazy-rules :rules="[val => val && val.length > 0 || 'Please type something']" />
            <q-input filled v-model="latitude" label="Feature Latitude *" hint="Click on the map to populate" lazy-rules
              :rules="[val => val && val.length > 0 || 'Please type something']" />
            <q-input filled v-model="longitude" label="Feature Longitude *" hint="Click on the map to populate" lazy-rules
              :rules="[val => val && val.length > 0 || 'Please type something']" />
            <div>
              <q-btn label="Submit" type="submit" color="primary" />
              <q-btn label="Reset" type="reset" color="primary" flat class="q-ml-sm" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style lang="sass">
.leaflet-control-geosearch .results.active
  color: black

.form-card
  width: 300px
  max-width: 80vw
  margin-right: 50px
</style>
