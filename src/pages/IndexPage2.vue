<script setup>
import { onMounted, onUnmounted, ref, shallowRef, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useForm } from '@tanstack/vue-form';
import { from, useObservable } from '@vueuse/rxjs';
import { liveQuery } from 'dexie';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { LocateControl } from 'leaflet.locatecontrol';

import { db } from '@/db';
import { featureSchema, fieldSchema } from '@/schemas';
import { confirmDeleteFeature } from '@/utils';
import { useCurrentLocation } from '@/composables/useCurrentLocation';
import { errorNotification, successNotification } from '@/utils/notifications';
import { buildFeaturePopup } from '@/utils/featurePopup';

import FeatureList from '@/components/FeatureList.vue';

const $q = useQuasar();
const isMobile = computed(() => $q.screen.lt.md);

const listDialog = ref(false);
const formDialog = shallowRef(false);

watch(isMobile, (mobile) => {
    if (!mobile) listDialog.value = false;
});

const mapContainer = ref(null);

const map = shallowRef(null);
const markersLayer = L.featureGroup();
const markerMap = new Map();

let osm = null;
let darkLayer = null;
let resizeObserver = null;

const features = useObservable(from(liveQuery(() => db.features.toArray())));
const searchQuery = ref('');

const filteredFeatures = computed(() => {
    const all = features.value || [];
    const query = searchQuery.value?.toLowerCase().trim();
    if (!query) return all;

    return all.filter(
        (f) => f.title.toLowerCase().includes(query) || (f.description && f.description.toLowerCase().includes(query))
    );
});


function createNewRecord() {
    return { title: '', description: '', latitude: '', longitude: '' };
}

const isEditing = ref(false);
const editingId = ref(null);

const form = useForm({
    defaultValues: createNewRecord(),
    validators: { onSubmit: featureSchema },
    onSubmit: async ({ value }) => {
        try {
            if (isEditing.value) {
                await db.features.update(editingId.value, value);
                successNotification('Feature Updated Successfully');
            } else {
                await db.features.add(value);
                successNotification('Feature Created Successfully');
            }
            closeForm();
        } catch (error) {
            console.error(error);
            errorNotification('Failed to save feature');
        }
    }
});

const { locating, getCurrentLocation } = useCurrentLocation();

async function fillCurrentLocation() {
    try {
        const { lat, lng } = await getCurrentLocation();
        form.setFieldValue('latitude', Number(lat.toFixed(6)))
        form.setFieldValue('longitude', Number(lng.toFixed(6)))
        // validators are onBlur-only, so clear any stale "required" errors
        form.validateField('latitude', 'blur')
        form.validateField('longitude', 'blur')
        flyToMarker([lat, lng])
        placeDraftMarker([lat, lng])
    } catch (error) {
        errorNotification(error.message)
    }
}

function showError(field) {
    return field.state.meta.isTouched && field.state.meta.errors.length > 0;
}

function errorMessage(field) {
    if (!showError(field)) return '';
    return field.state.meta.errors[0]?.message ?? field.state.meta.errors[0];
}

function submit() {
    form.handleSubmit();
}

function resetForm() {
    form.reset();
    form.validate();
    cancelPicking();
    clearDraftMarker();
}

function add() {
    listDialog.value = false;
    isEditing.value = false;
    editingId.value = null;
    form.reset();
    clearDraftMarker();
    formDialog.value = true;
}

function editFeature(feature) {
    listDialog.value = false;
    editingId.value = feature.id;
    isEditing.value = true;
    form.setFieldValue('title', feature.title);
    form.setFieldValue('description', feature.description);
    form.setFieldValue('latitude', feature.latitude);
    form.setFieldValue('longitude', feature.longitude);
    clearDraftMarker();
    formDialog.value = true;
}

function cancelEdit() {
    editingId.value = null;
    isEditing.value = false;
    form.reset();
    cancelPicking();
    clearDraftMarker();
}

function closeForm() {
    formDialog.value = false;
    cancelEdit();
}

function deleteFeature(id) {
    confirmDeleteFeature(id);
    cancelEdit();
}

const pickingLocation = ref(false);
const pendingCoordinates = ref(null);
const draftMarker = shallowRef(null);

const isBlank = (v) => v === '' || v === null || v === undefined;

function startPickingLocation() {
    const { latitude, longitude } = form.state.values;
    const lat = Number(latitude);
    const lng = Number(longitude);

    pickingLocation.value = true;
    pendingCoordinates.value = null;
    clearDraftMarker();

    if (!isBlank(latitude) && !isBlank(longitude) && Number.isFinite(lat) && Number.isFinite(lng)) {
        placeDraftMarker(lat, lng);
        map.value?.panTo([lat, lng]);
    }

    if (isMobile.value) formDialog.value = false;
}

function cancelPicking() {
    pickingLocation.value = false;
    pendingCoordinates.value = null;
}

function cancelPickingFromBanner() {
    cancelPicking();
    clearDraftMarker();
    formDialog.value = true;
}

function confirmPickedLocation() {
    if (!pendingCoordinates.value) return;
    const { lat, lng } = pendingCoordinates.value;

    form.setFieldValue('latitude', Number(lat.toFixed(6)));
    form.setFieldValue('longitude', Number(lng.toFixed(6)));

    pickingLocation.value = false;
    pendingCoordinates.value = null;
    formDialog.value = true;
}

function placeDraftMarker(lat, lng, { draggable = true } = {}) {
    clearDraftMarker();

    const { lat: wLat, lng: wLng } = L.latLng(lat, lng).wrap();

    const marker = L.marker([wLat, wLng], { draggable, opacity: 0.85 }).addTo(map.value)
    marker.on('dragend', (e) => {
        const currentLocation = e.target.getLatLng().wrap();
        pendingCoordinates.value = { lat: currentLocation.lat, lng: currentLocation.lng };
    });

    draftMarker.value = marker;
    pendingCoordinates.value = { lat: wLat, lng: wLng };
}

function clearDraftMarker() {
    if (draftMarker.value && map.value) {
        map.value.removeLayer(draftMarker.value);
    }
    draftMarker.value = null;
}

function onMapClick(e) {
    if (!pickingLocation.value) return;
    placeDraftMarker(e.latlng.lat, e.latlng.lng);
}

function textEl(text) {
    const el = document.createElement('div');
    el.textContent = text;
    return el;
}

function renderMarkers(list) {
    markersLayer.clearLayers();
    markerMap.clear();

    list.forEach((feature) => {
        const marker = L.marker([feature.latitude, feature.longitude])
            .bindTooltip(textEl(feature.title))
            .bindPopup(() => buildFeaturePopup(feature, popupActions), {
                autoClose: false,
                closeOnClick: false,
                closeButton: true,
                closeOnEscapeKey: true,
                maxWidth: 260
            });

        markersLayer.addLayer(marker);
        if (feature.id !== undefined) markerMap.set(feature.id, marker);
    });

    if (!searchQuery.value && list.length > 0) fitMapToMarkers();
}

function fitMapToMarkers() {
    if (!map.value || markersLayer.getLayers().length === 0) return;

    const bounds = markersLayer.getBounds();
    if (bounds.isValid()) {
        const pad = isMobile.value ? 20 : 50;
        map.value.fitBounds(bounds, { padding: [pad, pad], maxZoom: 16 });
    }
}

function flyToMarker(coordinates, zoom = 12) {
    if (map.value && coordinates) {
        map.value.flyTo(coordinates, zoom, { duration: 1.5 });
    }
}

function togglePopup(id) {
    markerMap.get(id)?.togglePopup();
}

function handleFeatureClick(feature) {
    listDialog.value = false;
    flyToMarker([feature.latitude, feature.longitude]);
    togglePopup(feature.id);
}

watch(
    filteredFeatures,
    (list) => {
        if (list) renderMarkers(list);
    },
    { immediate: true }
);

watch(
    () => $q.dark.isActive,
    (isDark) => {
        if (!map.value || !osm || !darkLayer) return;
        if (isDark) {
            if (map.value.hasLayer(osm)) map.value.removeLayer(osm);
            if (!map.value.hasLayer(darkLayer)) darkLayer.addTo(map.value);
        } else {
            if (map.value.hasLayer(darkLayer)) map.value.removeLayer(darkLayer);
            if (!map.value.hasLayer(osm)) osm.addTo(map.value);
        }
    }
);

watch(pickingLocation, (picking) => {
    const el = map.value?.getContainer();
    if (el) el.style.cursor = picking ? 'crosshair' : '';
});

onMounted(() => {
    osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    darkLayer = maplibreGL({ style: 'https://tiles.openfreemap.org/styles/dark' });

    map.value = L.map(mapContainer.value, {
        minZoom: 2,
        zoomControl: !$q.platform.is.mobile,
        layers: [$q.dark.isActive ? darkLayer : osm],
        markerZoomAnimation: true
    }).setView([0, 0], 2);

    L.control.layers({ OpenStreetMap: osm, 'OpenFreeMap Dark': darkLayer }).addTo(map.value);
    markersLayer.addTo(map.value);

    map.value.addControl(new GeoSearchControl({ provider: new OpenStreetMapProvider(), style: 'button' }));
    map.value.addControl(new LocateControl());

    map.value.on('click', onMapClick);

    // The container size changes when the sidebar appears/disappears, on rotation,
    // and when browser chrome collapses. Without this Leaflet shows grey tiles.
    resizeObserver = new ResizeObserver(() => map.value?.invalidateSize());
    resizeObserver.observe(mapContainer.value);

    fitMapToMarkers();
});

onUnmounted(() => {
    resizeObserver?.disconnect();
    if (map.value) {
        map.value.off('click', onMapClick);
        map.value.remove();
        map.value = null;
    }
});

const popupActions = {
    onEdit(feature) {
        if (pickingLocation.value) return;
        markerMap.get(feature.id)?.closePopup();
        editFeature(feature);
    },
    onDelete(feature) {
        if (pickingLocation.value) return;
        markerMap.get(feature.id)?.closePopup();
        deleteFeature(feature.id);
    }
};
</script>

<template>
    <q-page class="row no-wrap overflow-hidden">
        <div v-if="!isMobile" class="sidebar">
            <FeatureList v-model:search="searchQuery" :features="filteredFeatures" @add="add"
                @select="handleFeatureClick" @edit="editFeature" @remove="deleteFeature" />
        </div>

        <div class="col relative-position">
            <div ref="mapContainer" class="absolute-full map-container"></div>

            <q-banner v-if="pickingLocation" dense rounded class="picking-banner bg-primary text-white">
                <template #avatar>
                    <q-icon name="my_location" />
                </template>
                {{ pendingCoordinates ? 'Drag the pin to adjust, then confirm.' : 'Tap the map to place a pin.' }}
                <template #action>
                    <q-btn flat no-caps label="Cancel" @click="cancelPickingFromBanner" />
                    <q-btn unelevated no-caps color="white" text-color="primary" label="Confirm"
                        :disable="!pendingCoordinates" @click="confirmPickedLocation" />
                </template>
            </q-banner>
        </div>

        <q-page-sticky v-if="isMobile && !pickingLocation" position="bottom-right" :offset="[20, 50]">
            <q-fab icon="menu" active-icon="close" color="primary" direction="up" vertical-actions-align="right">
                <q-fab-action color="primary" icon="list" label="Features" @click="listDialog = true" />
                <q-fab-action color="secondary" icon="add" label="Add" @click="add" />
            </q-fab>
        </q-page-sticky>

        <q-dialog v-model="listDialog" position="bottom">
            <q-card class="sheet list-sheet">
                <div class="sheet-handle"></div>
                <FeatureList v-model:search="searchQuery" :features="filteredFeatures" @add="add"
                    @select="handleFeatureClick" @edit="editFeature" @remove="deleteFeature" />
            </q-card>
        </q-dialog>

        <q-dialog v-model="formDialog" persistent :seamless="!isMobile" :position="isMobile ? 'bottom' : 'right'">
            <q-card class="sheet form-sheet column no-wrap">
                <div v-if="isMobile" class="sheet-handle"></div>

                <q-toolbar class="col-auto">
                    <q-toolbar-title>{{ isEditing ? 'Edit Feature' : 'Add Feature' }}</q-toolbar-title>
                    <q-btn flat round icon="close" @click="closeForm" />
                </q-toolbar>

                <q-separator />

                <q-card-section class="col scroll">
                    <form @submit.prevent.stop="submit">
                        <div class="column q-gutter-md">
                            <form.Field name="title"
                                :validators="{ onBlur: fieldSchema.title, onMount: fieldSchema.title }">
                                <template #default="{ field }">
                                    <q-input :model-value="field.state.value" @update:model-value="field.handleChange"
                                        @blur="field.handleBlur" label="Title" placeholder="Cafe.."
                                        :disable="form.state.isSubmitting" filled stack-label :error="showError(field)"
                                        :error-message="errorMessage(field)" bottom-slots />
                                </template>
                            </form.Field>

                            <form.Field name="description"
                                :validators="{ onBlur: fieldSchema.description, onMount: fieldSchema.description }">
                                <template #default="{ field }">
                                    <q-input type="textarea" autogrow :model-value="field.state.value"
                                        @update:model-value="field.handleChange" @blur="field.handleBlur"
                                        label="Description" placeholder="My favorite cafe"
                                        :disable="form.state.isSubmitting" filled stack-label :error="showError(field)"
                                        :error-message="errorMessage(field)" bottom-slots />
                                </template>
                            </form.Field>

                            <q-separator spaced />

                            <div class="text-subtitle2 text-grey-8">Location</div>

                            <q-btn unelevated no-caps class="full-width" icon="my_location" size="md"
                                :color="pickingLocation ? 'primary' : 'secondary'"
                                :label="pickingLocation ? 'Picking… (see the map)' : 'Pick location on map'"
                                @click="pickingLocation ? cancelPickingFromBanner() : startPickingLocation()" />
                            <q-btn outline no-caps class="full-width" color="secondary" icon="gps_fixed"
                                label="Use my location" :loading="locating"
                                :disable="pickingLocation || form.state.isSubmitting" @click="fillCurrentLocation" />

                            <div class="row q-col-gutter-sm">
                                <div class="col-12 col-sm-6">
                                    <form.Field name="latitude"
                                        :validators="{ onBlur: fieldSchema.latitude, onMount: fieldSchema.latitude }">
                                        <template #default="{ field }">
                                            <q-input type="number" step="any" inputmode="decimal"
                                                :model-value="field.state.value"
                                                @update:model-value="field.handleChange" @blur="field.handleBlur"
                                                label="Latitude" placeholder="70.123456"
                                                :disable="form.state.isSubmitting || pickingLocation" filled stack-label
                                                :error="showError(field)" :error-message="errorMessage(field)"
                                                bottom-slots />
                                        </template>
                                    </form.Field>
                                </div>
                                <div class="col-12 col-sm-6">
                                    <form.Field name="longitude"
                                        :validators="{ onBlur: fieldSchema.longitude, onMount: fieldSchema.longitude }">
                                        <template #default="{ field }">
                                            <q-input type="number" step="any" inputmode="decimal"
                                                :model-value="field.state.value"
                                                @update:model-value="field.handleChange" @blur="field.handleBlur"
                                                label="Longitude" placeholder="-20.123456"
                                                :disable="form.state.isSubmitting || pickingLocation" filled stack-label
                                                :error="showError(field)" :error-message="errorMessage(field)"
                                                bottom-slots />
                                        </template>
                                    </form.Field>
                                </div>
                            </div>
                        </div>
                    </form>
                </q-card-section>

                <q-separator />

                <q-card-actions class="col-auto form-actions q-pa-md">
                    <q-btn flat no-caps label="Reset" @click="resetForm" />
                    <q-space />
                    <q-btn flat no-caps color="grey" label="Cancel" @click="closeForm" />
                    <form.Subscribe>
                        <template v-slot="{ canSubmit, isSubmitting }">
                            <q-btn color="primary" unelevated no-caps :disable="!canSubmit"
                                :label="isSubmitting ? 'Saving...' : 'Save'" @click="submit" />
                        </template>
                    </form.Subscribe>
                </q-card-actions>
            </q-card>
        </q-dialog>
    </q-page>
</template>

<style scoped>
.sidebar {
    width: 350px;
    flex: none;
    border-right: 1px solid rgba(128, 128, 128, 0.3);
}

.map-container {
    isolation: isolate;
}

.picking-banner {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: calc(8px + env(safe-area-inset-bottom, 0px));
    max-width: 520px;
    margin: 0 auto;
    z-index: 1;
}

.sheet {
    width: 440px;
    max-width: 100vw;
}

.form-sheet {
    max-height: 90dvh;
}

.list-sheet {
    height: 65dvh;
}

.sheet-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: rgba(128, 128, 128, 0.5);
    margin: 8px auto 0;
}

.form-actions {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

@media (max-width: 1023.98px) {
    .sheet {
        width: 100%;
        border-radius: 16px 16px 0 0;
    }

    .form-sheet {
        max-height: 88dvh;
    }
}

.map-container :deep(.feature-popup__title) {
    font-weight: 700;
    margin-bottom: 4px;
    overflow-wrap: anywhere;
}

.map-container :deep(.feature-popup__description) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 30vh;
    overflow-y: auto;
    margin-bottom: 8px;
}

.map-container :deep(.feature-popup__actions) {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.map-container :deep(.feature-popup__btn) {
    min-height: 40px;
    /* comfortable touch target */
    padding: 0 14px;
    border: 0;
    border-radius: 4px;
    font: inherit;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
}

.map-container :deep(.feature-popup__btn--edit) {
    background: #1976d2;
}

.map-container :deep(.feature-popup__btn--delete) {
    background: #c10015;
}
</style>