<script setup>
import { computed, ref, watch } from 'vue'
import { useForm } from '@tanstack/vue-form'
import { from, useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { exportDB, importDB } from 'dexie-export-import'
import download from 'downloadjs'
import { date, useQuasar } from 'quasar'

import { db } from '@/db/index.js'
import { featureSchema } from '@/schemas'
import { confirmDeleteFeature } from '@/utils'
import { errorNotification, successNotification } from '@/utils/notifications'
import FeatureFormCard from '@/components/FeatureFormCard.vue'

const $q = useQuasar()

// < 1024px: cards instead of a table, form in a bottom sheet, FAB to add
const isMobile = computed(() => $q.screen.lt.md)

const allFeatures = useObservable(from(liveQuery(() => db.features.toArray())))
const features = computed(() => allFeatures.value || [])

const columns = [
    { name: 'title', label: 'Title', field: 'title', align: 'left', sortable: true },
    // long descriptions are truncated instead of stretching the table
    { name: 'description', label: 'Description', field: 'description', align: 'left', classes: 'ellipsis', style: 'max-width: 260px' },
    { name: 'latitude', label: 'Latitude', field: 'latitude', align: 'right', sortable: true },
    { name: 'longitude', label: 'Longitude', field: 'longitude', align: 'right', sortable: true },
    { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const editingId = ref(null)
const searchQuery = ref('')
const selected = ref([])
const formDialog = ref(false) // mobile bottom sheet only

const fileInput = ref(null)
const importFile = ref(null)

watch(isMobile, (mobile) => {
    if (!mobile) formDialog.value = false // resized/rotated to desktop: inline form takes over
})

const filteredFeatures = computed(() => {
    const all = features.value
    if (!searchQuery.value) return all
    const query = searchQuery.value.toLowerCase().trim()

    return all.filter(feature =>
        feature.title.toLowerCase().includes(query) ||
        (feature.description && feature.description.toLowerCase().includes(query))
    )
})

const form = useForm({
    defaultValues: {
        title: '',
        description: '',
        latitude: '',
        longitude: '',
    },
    validators: {
        onSubmit: featureSchema,
    },
    onSubmit: async ({ value }) => {
        try {
            if (editingId.value) {
                await db.features.update(editingId.value, value)
                successNotification('Feature updated')
            } else {
                await db.features.add(value)
                successNotification('Feature created')
            }
            formDialog.value = false
            cancelEdit()
        } catch (error) {
            console.error(error)
            errorNotification('Failed to save feature')
        }
    },
})

function add() {
    cancelEdit()
    formDialog.value = true
}

function editFeature(feature) {
    editingId.value = feature.id
    form.setFieldValue('title', feature.title)
    form.setFieldValue('description', feature.description)
    form.setFieldValue('latitude', feature.latitude)
    form.setFieldValue('longitude', feature.longitude)
    if (isMobile.value) formDialog.value = true
}

function deleteFeature(id) {
    confirmDeleteFeature(id)
}

function cancelEdit() {
    editingId.value = null
    form.reset()
}

function deleteSelected() {
    if (!selected.value.length) return

    $q.dialog({
        title: 'Delete features',
        message: `Delete ${selected.value.length} selected feature(s)? This cannot be undone.`,
        cancel: true,
        persistent: true,
        ok: { label: 'Delete', color: 'negative', flat: true },
    }).onOk(async () => {
        const ids = selected.value.map(row => row.id)
        await db.features.bulkDelete(ids)
        selected.value = []
        successNotification(`${ids.length} feature(s) deleted`)
    })
}

async function exportData() {
    try {
        const blob = await exportDB(db, { prettyJson: true })
        const today = date.formatDate(Date.now(), 'YYYY-MM-DDTHH:mm:ss')
        download(blob, `features-export-${today}.json`, 'application/json')
        successNotification('Features exported successfully')
    } catch (error) {
        errorNotification('Export failed')
    }
}

async function importData(file) {
    if (!file) return

    try {
        await importDB(file)
        successNotification('Features imported successfully')
    } catch (err) {
        errorNotification('Import failed')
        console.error('Import failed:', err)
    } finally {
        importFile.value = null
    }
}
</script>

<template>
    <!-- Extra bottom padding on mobile so the FAB never covers the last card / pagination -->
    <q-page padding :style="isMobile ? 'padding-bottom: 88px' : ''">
        <div class="row q-col-gutter-md">
            <!-- Desktop: the form lives inline in a side column -->
            <div v-if="!isMobile" class="col-12 col-md-4 col-lg-3">
                <FeatureFormCard :form="form" :editing="!!editingId" @cancel="cancelEdit" />
            </div>

            <div class="col-12 col-md-8 col-lg-9">
                <q-card flat bordered>
                    <q-toolbar>
                        <q-icon name="place" size="sm" class="q-mr-sm" />
                        <q-toolbar-title>Features</q-toolbar-title>
                    </q-toolbar>
                    <q-separator />

                    <!-- grid = one card per feature on mobile, a real table on desktop -->
                    <q-table flat :grid="isMobile" :rows="filteredFeatures" :columns="columns" row-key="id"
                        selection="multiple" v-model:selected="selected"
                        :rows-per-page-options="isMobile ? [10, 25, 0] : [10, 25, 50, 0]">
                        <template #top>
                            <div class="row full-width items-center q-col-gutter-sm">
                                <div class="col-12 col-md-4">
                                    <q-input dense outlined clearable debounce="300" v-model="searchQuery"
                                        placeholder="Search">
                                        <template #prepend><q-icon name="search" /></template>
                                    </q-input>
                                </div>

                                <div class="col-12 col-md row items-center justify-end no-wrap">
                                    <q-chip v-if="selected.length" color="primary" text-color="white" icon="check_box">
                                        {{ selected.length }} selected
                                    </q-chip>
                                    <q-btn v-if="selected.length" flat color="negative" icon="delete_sweep"
                                        :round="isMobile" :label="isMobile ? undefined : 'Delete selected'"
                                        class="q-ml-sm" @click="deleteSelected" />

                                    <!-- Hidden picker: a 25%-wide q-file doesn't fit on a phone, so use a button -->
                                    <q-file ref="fileInput" v-model="importFile" accept=".json" class="hidden"
                                        @update:model-value="importData" />
                                    <q-btn flat color="primary" icon="upload_file" :round="isMobile"
                                        :label="isMobile ? undefined : 'Import'" class="q-ml-sm"
                                        @click="fileInput.pickFiles()" />
                                    <q-btn unelevated color="primary" icon="save_alt" :round="isMobile"
                                        :label="isMobile ? undefined : 'Export'" class="q-ml-sm" @click="exportData" />
                                </div>
                            </div>
                        </template>

                        <!-- Desktop table: action cell -->
                        <template #body-cell-actions="props">
                            <q-td :props="props" class="text-center">
                                <q-btn dense flat round icon="edit" color="primary" @click="editFeature(props.row)" />
                                <q-btn dense flat round icon="delete" color="negative"
                                    @click="deleteFeature(props.row.id)" />
                            </q-td>
                        </template>

                        <!-- Mobile: one card per feature -->
                        <template #item="props">
                            <div class="col-12 col-sm-6 q-pa-xs">
                                <q-card flat bordered>
                                    <q-card-section class="row no-wrap items-start">
                                        <q-checkbox v-model="props.selected" class="q-mr-sm" />
                                        <div class="col">
                                            <div class="text-subtitle1 text-weight-bold">{{ props.row.title }}</div>
                                            <div v-if="props.row.description" class="text-body2 text-grey-8 q-mt-xs">
                                                {{ props.row.description }}
                                            </div>
                                            <div class="text-caption text-grey-7 q-mt-sm row items-center">
                                                <q-icon name="place" size="xs" class="q-mr-xs" />
                                                {{ props.row.latitude }}, {{ props.row.longitude }}
                                            </div>
                                        </div>
                                    </q-card-section>
                                    <q-separator />
                                    <q-card-actions align="right">
                                        <q-btn flat no-caps color="primary" icon="edit" label="Edit"
                                            @click="editFeature(props.row)" />
                                        <q-btn flat no-caps color="negative" icon="delete" label="Delete"
                                            @click="deleteFeature(props.row.id)" />
                                    </q-card-actions>
                                </q-card>
                            </div>
                        </template>
                    </q-table>
                </q-card>
            </div>
        </div>

        <!-- Mobile: FAB opens the form sheet -->
        <q-page-sticky v-if="isMobile" position="bottom-right" :offset="[16, 16]">
            <q-btn fab color="primary" icon="add" @click="add" />
        </q-page-sticky>

        <!-- Mobile: form as a bottom sheet. @hide covers backdrop-tap and swipe dismissal -->
        <q-dialog v-if="isMobile" v-model="formDialog" position="bottom" @hide="cancelEdit">
            <FeatureFormCard sheet :form="form" :editing="!!editingId" @cancel="formDialog = false"
                @close="formDialog = false" />
        </q-dialog>
    </q-page>
</template>