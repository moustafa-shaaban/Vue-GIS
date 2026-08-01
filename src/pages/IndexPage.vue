<script setup>
import { onMounted, onUnmounted, ref, shallowRef, watch, computed } from 'vue';
import { Notify, useQuasar } from 'quasar';
import { useForm } from '@tanstack/vue-form';
import { from, useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'

import L from "leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { LocateControl } from 'leaflet.locatecontrol';

import { db } from '@/db';
import { featureSchema, fieldSchema } from '@/schemas';
import { confirmDeleteFeature } from '@/utils';
import { errorNotification, successNotification } from '@/utils/notifications';

const $q = useQuasar();

const mapContainer = ref(null);

/**
 ShallowRef is strongly recommended over standard ref for storing Leaflet map instances
 because it avoids the massive performance overhead of turning complex third-party class instances into
 deep reactive proxy objects.
**/
const map = shallowRef(null);
const markersLayer = L.featureGroup();

//const features = ref([]);
const features = useObservable(
  from(liveQuery(() => db.features.toArray()))
)

const markerMap = new Map();
const searchQuery = ref('');

const pickingLocation = ref(false);
const draftMarker = shallowRef(null);
let dismissPickingLocationNotification = null;

function createNewRecord() {
  return {
    title: '',
    description: '',
    latitude: '',
    longitude: ''
  }
}

const formDialog = shallowRef(false);
const isEditing = ref(false);
const editingId = ref(null);

const form = useForm({
  defaultValues: createNewRecord(),

  validators: {
    onSubmit: featureSchema,
  },

  onSubmit: async ({ value }) => {
    try {
      if (isEditing.value) {
        await db.features.update(editingId.value, value);
        successNotification('Feature Updated Successfully')
      } else {
        await db.features.add(value);
        successNotification('Feature Created Successfully')
      }
      formDialog.value = false;
      cancelEdit();
    } catch (error) {
      console.error(error);
      errorNotification('Failed to save feature')
    }
  },
});

function showError(field) {
  return field.state.meta.isTouched && field.state.meta.errors.length > 0
}

function errorMessage(field) {
  if (!showError(field)) return ''
  return field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]
}

function submit() {
  form.handleSubmit();
}

function resetForm() {
  form.reset();
  form.validate()
  clearDraftMarker()
}

function add() {
  isEditing.value = false;
  editingId.value = null;
  form.reset();
  clearDraftMarker();
  formDialog.value = true;
}

function editFeature(feature) {
  editingId.value = feature.id;
  isEditing.value = true;
  form.setFieldValue('title', feature.title);
  form.setFieldValue('description', feature.description);
  form.setFieldValue('latitude', feature.latitude);
  form.setFieldValue('longitude', feature.longitude);
  clearDraftMarker();
  formDialog.value = true;
}

function deleteFeature(id) {
  confirmDeleteFeature(id);
  cancelEdit();
}

function cancelEdit() {
  editingId.value = null;
  isEditing.value = false;
  form.reset();
  stopPickingLocation();
  clearDraftMarker();
}

function startPickingLocation() {
  pickingLocation.value = true;
  dismissPickingLocationNotification = Notify.create({
    message: 'Click anywhere on the map to set the location',
    timeout: 0,
    color: 'primary',
    icon: 'my_location',
    actions: [{ label: 'Cancel', color: 'white', handler: stopPickingLocation }]
  });
}

function stopPickingLocation() {
  pickingLocation.value = false;
  if (dismissPickingLocationNotification) {
    dismissPickingLocationNotification();
    dismissPickingLocationNotification = null;
  }
}

function clearDraftMarker() {
  if (draftMarker.value && map.value) {
    map.value.removeLayer(draftMarker.value);
  }
  draftMarker.value = null;
}

function setCoordinates(lat, lng) {
  form.setFieldValue('latitude', Number(lat.toFixed(6)));
  form.setFieldValue('longitude', Number(lng.toFixed(6)));

  clearDraftMarker();
  draftMarker.value = L.marker([lat, lng], { opacity: 0.6 }).addTo(map.value);
}

function onMapClick(e) {
  if (!pickingLocation.value) return;
  const { lat, lng } = e.latlng;
  setCoordinates(lat, lng);
  stopPickingLocation();
}

function flyToMarker(coordinates, zoom = 12) {
  if (map.value && coordinates) {
    map.value.flyTo(coordinates, zoom, {
      duration: 3
    });
  }
}

function togglePopup(id) {
  const marker = markerMap.get(id);
  if (marker) {
    marker.togglePopup();
  }
}

function handleFeatureClick(feature) {
  const coords = [feature.latitude, feature.longitude];
  flyToMarker(coords);
  togglePopup(feature.id);
}

function fitMapToMarkers() {
  if (!map.value || features.value.length === 0) return;

  const bounds = markersLayer.getBounds();
  if (bounds.isValid()) {
    map.value.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16
    });
  }
}

const filteredFeatures = computed(() => {
  const allFeatures = features.value || []
  if (!searchQuery.value) return allFeatures;
  const query = searchQuery.value.toLowerCase().trim();

  return allFeatures.filter(feature =>
    feature.title.toLowerCase().includes(query) ||
    (feature.description && feature.description.toLowerCase().includes(query))
  );
});

function renderMarkers(markersList) {
  markersLayer.clearLayers();
  markerMap.clear();

  markersList.forEach((feature) => {
    const marker = L.marker([feature.latitude, feature.longitude])
      .bindTooltip(feature.title)
      .bindPopup(feature.description || feature.title, {
        autoClose: false,
        closeOnClick: false,
        closeButton: true,
        closeOnEscapeKey: true
      });

    markersLayer.addLayer(marker);

    if (feature.id !== undefined) {
      markerMap.set(feature.id, marker);
    }
  });

  if (!searchQuery.value && markersList.length > 0) {
    fitMapToMarkers();
  }
}

watch(filteredFeatures, (newFilteredData) => {
  if (!newFilteredData) return;
  renderMarkers(newFilteredData);
}, { immediate: true });

onMounted(async () => {
  let osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  let cartoDBDarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  });

  let baseLayer = $q.dark.isActive ? cartoDBDarkMatter : osm;

  map.value = L.map(mapContainer.value, {
    minZoom: 2,
    zoomControl: true,
    zoom: 2,
    layers: [baseLayer],
    markerZoomAnimation: true,
    fullscreenControl: true,
  }).setView([0, 0], 2);

  watch(() => $q.dark.isActive, (isDark) => {
    if (isDark) {
      map.value.removeLayer(osm);
      cartoDBDarkMatter.addTo(map.value);
    } else {
      map.value.removeLayer(cartoDBDarkMatter);
      osm.addTo(map.value);
    }
  });

  let baseMaps = {
    "OpenStreetMap": osm,
    "CartoDB.DarkMatter": cartoDBDarkMatter,
  };

  L.control.layers(baseMaps).addTo(map.value);
  markersLayer.addTo(map.value);

  const searchControl = new GeoSearchControl({
    provider: new OpenStreetMapProvider(),
    style: 'button',
  });

  const locateControl = new LocateControl();

  map.value.addControl(searchControl);
  map.value.addControl(locateControl);

  map.value.on('click', onMapClick);

  watch(pickingLocation, (picking) => {
    /*
      getContainer() is a map method that returns the HTML element that contains the map
      https://leafletjs.com/reference.html#map-getcontainer
    */
    const mapContainer = map.value?.getContainer();
    if (mapContainer) {
      mapContainer.style.cursor = picking ? 'crosshair' : '';
    }
  });

});

onUnmounted(() => {
  if (map.value) {
    stopPickingLocation()
    map.value.off('click', onMapClick);
    map.value.remove();
  }
});
</script>

<template>
  <q-page class="row fit">

    <div style="width:350px;">
      <q-toolbar>
        <q-toolbar-title>Features ({{ filteredFeatures.length }})</q-toolbar-title>
        <q-btn flat dense label="Add Feature" icon="add" @click="add" />
      </q-toolbar>

      <div class="q-pa-sm">
        <q-input v-model="searchQuery" dense filled placeholder="Search features..." clearable>
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <q-list separator class="q-pt-none">
        <q-item v-if="filteredFeatures.length === 0" class="q-pa-md text-center">
          <q-item-section>No matching features found.</q-item-section>
        </q-item>

        <q-item v-for="feature in filteredFeatures" :key="feature.id">
          <q-item-section avatar>
            <q-icon name="place" color="primary" />
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-bold">{{ feature.title }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row no-wrap">
              <q-btn dense flat icon="edit" color="primary" @click="editFeature(feature)" />
              <q-btn dense flat icon="flight" @click="handleFeatureClick(feature)" />
              <q-btn dense flat icon="delete" color="negative" @click="deleteFeature(feature.id)" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <div class="col relative-position">
      <div ref="mapContainer" style="height: 93dvh;"></div>
    </div>

    <q-dialog v-model="formDialog" persistent seamless position="right" @hide="stopPickingLocation">
      <q-card class="q-pa-md" style="width: 440px; max-width: 90vw;">
        <q-toolbar>
          <q-toolbar-title>{{ editingId ? 'Edit Feature' : 'Add Feature' }}</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>

        <q-separator />

        <q-card-section>

          <form @submit.prevent.stop="submit">
            <div class="column q-gutter-md">


              <form.Field name="title" :validators="{ onBlur: fieldSchema.title, onMount: fieldSchema.title }">
                <template #default="{ field }">
                  <q-input :model-value="field.state.value" @update:model-value="field.handleChange"
                    @blur="field.handleBlur" label="Title" placeholder="Cafe.." :disable="form.state.isSubmitting"
                    filled stack-label :error="showError(field)" :error-message="errorMessage(field)" bottom-slots />
                </template>
              </form.Field>

              <form.Field name="description"
                :validators="{ onBlur: fieldSchema.description, onMount: fieldSchema.description }">
                <template #default="{ field }">
                  <q-input type="textarea" :model-value="field.state.value" @update:model-value="field.handleChange"
                    @blur="field.handleBlur" label="Description" placeholder="My favorite cafe"
                    :disable="form.state.isSubmitting" filled stack-label :error="showError(field)"
                    :error-message="errorMessage(field)" bottom-slots />
                </template>
              </form.Field>

              <q-separator spaced />

              <div class="text-subtitle2 text-grey-8">
                Location
              </div>

              <div class="row q-col-gutter-md">


                <div class="row items-start q-col-gutter-sm">
                  <div class="col">
                    <form.Field name="latitude"
                      :validators="{ onBlur: fieldSchema.latitude, onMount: fieldSchema.latitude }">
                      <template #default="{ field }">
                        <q-input type="number" :model-value="field.state.value" @update:model-value="field.handleChange"
                          @blur="field.handleBlur" label="Latitude" placeholder="70.123456"
                          :disable="form.state.isSubmitting || pickingLocation" filled stack-label
                          :error="showError(field)" :error-message="errorMessage(field)" bottom-slots />
                      </template>
                    </form.Field>
                  </div>
                  <div class="col">
                    <form.Field name="longitude"
                      :validators="{ onBlur: fieldSchema.longitude, onMount: fieldSchema.longitude }">
                      <template #default="{ field }">
                        <q-input type="number" :model-value="field.state.value" @update:model-value="field.handleChange"
                          @blur="field.handleBlur" label="Longitude" placeholder="-20.123456"
                          :disable="form.state.isSubmitting || pickingLocation" filled stack-label
                          :error="showError(field)" :error-message="errorMessage(field)" bottom-slots />
                      </template>
                    </form.Field>
                  </div>
                </div>
              </div>

              <q-btn class="q-mb-md full-width" unelevated icon="my_location" color="secondary"
                :color="pickingLocation ? 'primary' : 'secondary'"
                :label="pickingLocation ? 'Click the map to set location…' : 'Pick location on map'"
                @click="pickingLocation ? stopPickingLocation() : startPickingLocation()" />

              <div class="row q-gutter-sm">
                <form.Subscribe>
                  <template v-slot="{ canSubmit, isSubmitting }">
                    <q-btn color="primary" unelevated type="submit" :disable="!canSubmit"
                      :label="isSubmitting ? 'Saving...' : 'Save'" />
                  </template>
                </form.Subscribe>
                <q-space />
                <q-btn flat color="grey" label="Cancel" @click="formDialog = false; cancelEdit()" />
                <q-btn label="Reset" flat @click="resetForm" />
              </div>
            </div>
          </form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.q-field__bottom {
  font-size: 0.85rem;
  line-height: 1.3;
}
</style>