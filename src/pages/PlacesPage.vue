<script setup>
import { computed, ref } from 'vue'
import { useForm } from '@tanstack/vue-form'
import { from, useObservable } from '@vueuse/rxjs'
import { liveQuery } from 'dexie'
import { exportDB, importDB } from 'dexie-export-import'
import download from 'downloadjs'
import { date, useQuasar } from 'quasar'

import { db } from '@/db/index.js'
import { fieldSchema, featureSchema } from '@/schemas'
import { confirmDeleteFeature } from '@/utils'
import { errorNotification, successNotification } from '@/utils/notifications'

const $q = useQuasar()

const allFeatures = useObservable(
    from(liveQuery(() => db.features.toArray()))
)

const features = computed(() => allFeatures.value || [])

const columns = [
    { name: 'title', label: 'Title', field: 'title', align: 'left', sortable: true },
    { name: 'description', label: 'Description', field: 'description', align: 'left' },
    { name: 'latitude', label: 'Latitude', field: 'latitude', align: 'right', sortable: true },
    { name: 'longitude', label: 'Longitude', field: 'longitude', align: 'right', sortable: true },
    { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

const editingId = ref(null)
const searchQuery = ref('')
const selected = ref([])

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
        if (editingId.value) {
            await db.features.update(editingId.value, value)
        } else {
            await db.features.add(value)
        }
        cancelEdit()
    },
})

function editFeature(feature) {
    editingId.value = feature.id
    form.setFieldValue('title', feature.title)
    form.setFieldValue('description', feature.description)
    form.setFieldValue('latitude', feature.latitude)
    form.setFieldValue('longitude', feature.longitude)
}

function deleteFeature(id) {
    confirmDeleteFeature(id)
}

function cancelEdit() {
    editingId.value = null
    form.reset()
}

function submit() {
    form.handleSubmit()
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
    }
}
</script>

<template>
    <q-page padding class="row fit">
        <q-card flat bordered class="col-3" style="height: 89dvh;">
            <q-toolbar class="">
                <q-icon :name="editingId ? 'edit_location' : 'add_location'" size="sm" class="q-mr-sm" />
                <q-toolbar-title>
                    {{ editingId ? 'Edit Feature' : 'Add Feature' }}
                </q-toolbar-title>
            </q-toolbar>

            <q-card-section>
                <q-form @submit.prevent="submit" class="col q-col-gutter-lg">
                    <form.Field name="title" :validators="{ onBlur: fieldSchema.title }">
                        <template #default="{ field }">
                            <q-input class="col-12 col-md-6" dense outlined stack-label :model-value="field.state.value"
                                @update:model-value="field.handleChange" @blur="field.handleBlur" label="Title"
                                placeholder="Cafe.." :disable="form.state.isSubmitting"
                                :error="field.state.meta.errors.length > 0"
                                :error-message="field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]">
                                <template #prepend><q-icon name="label" /></template>
                            </q-input>
                        </template>
                    </form.Field>

                    <form.Field name="description" :validators="{ onBlur: fieldSchema.description }">
                        <template #default="{ field }">
                            <q-input class="col-12 col-md-6" dense outlined stack-label type="textarea"
                                :model-value="field.state.value" @update:model-value="field.handleChange"
                                @blur="field.handleBlur" label="Description" placeholder="My favorite cafe"
                                :disable="form.state.isSubmitting" :error="field.state.meta.errors.length > 0"
                                :error-message="field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]">
                                <template #prepend><q-icon name="notes" /></template>
                            </q-input>
                        </template>
                    </form.Field>

                    <div class="q-col-gutter-md">
                        <form.Field name="latitude" :validators="{ onBlur: fieldSchema.latitude }" class="q-my-4">
                            <template #default="{ field }">
                                <q-input class="col-8 col-md-6" dense outlined stack-label type="number"
                                    :model-value="field.state.value" @update:model-value="field.handleChange"
                                    @blur="field.handleBlur" label="Latitude" placeholder="70.123456"
                                    :disable="form.state.isSubmitting" :error="field.state.meta.errors.length > 0"
                                    :error-message="field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]">
                                    <template #prepend><q-icon name="place" /></template>
                                </q-input>
                            </template>
                        </form.Field>


                        <form.Field name="longitude" :validators="{ onBlur: fieldSchema.longitude }">
                            <template #default="{ field }">
                                <q-input class="col-8 col-md-6" dense outlined stack-label type="number"
                                    :model-value="field.state.value" @update:model-value="field.handleChange"
                                    @blur="field.handleBlur" label="Longitude" placeholder="-20.123456"
                                    :disable="form.state.isSubmitting" :error="field.state.meta.errors.length > 0"
                                    :error-message="field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]">
                                    <template #prepend><q-icon name="place" /></template>
                                </q-input>
                            </template>
                        </form.Field>

                    </div>
                    <div class="col-12 row q-gutter-sm items-center">
                        <form.Subscribe>
                            <template v-slot="{ canSubmit, isSubmitting }">
                                <q-btn unelevated color="primary" type="submit" icon="save" :disable="!canSubmit"
                                    :loading="isSubmitting" :label="editingId ? 'Update' : 'Save'" />
                            </template>
                        </form.Subscribe>
                        <q-btn flat color="grey-8" icon="close" label="Cancel" v-if="editingId" @click="cancelEdit" />
                        <q-space />
                        <q-btn flat color="grey-8" icon="restart_alt" label="Reset" @click="form.reset" />
                    </div>
                </q-form>
            </q-card-section>
        </q-card>

        <q-card flat bordered class="col-9" style="height: 89dvh;">
            <q-toolbar>
                <q-icon name="place" size="sm" class="q-mr-sm" />
                <q-toolbar-title>Features</q-toolbar-title>
            </q-toolbar>
            <q-separator />

            <q-table flat :rows="filteredFeatures" :columns="columns" row-key="id" selection="multiple"
                v-model:selected="selected" :rows-per-page-options="[10, 25, 50, 0]">
                <template v-slot:top>
                    <q-input dense outlined clearable debounce="300" v-model="searchQuery" placeholder="Search"
                        class="col-12 col-sm-4">
                        <template v-slot:prepend><q-icon name="search" /></template>
                    </q-input>

                    <q-space />

                    <q-chip v-if="selected.length" color="primary" text-color="white" icon="check_box" class="q-mr-sm">
                        {{ selected.length }} selected
                    </q-chip>
                    <q-btn v-if="selected.length" flat color="negative" icon="delete_sweep" label="Delete selected"
                        @click="deleteSelected" class="q-mr-sm" />

                    <q-file dense outlined accept=".json" label="Upload JSON" @update:model-value="importData"
                        class="col-3 q-mr-sm">
                        <template #prepend><q-icon name="upload_file" /></template>
                    </q-file>
                    <q-btn unelevated icon="save_alt" color="primary" label="Export" @click="exportData" />
                </template>

                <template #body-cell-actions="props">
                    <q-td :props="props" class="text-center">
                        <q-btn dense flat round icon="edit" color="primary" @click="editFeature(props.row)" />
                        <q-btn dense flat round icon="delete" color="negative" @click="deleteFeature(props.row.id)" />
                    </q-td>
                </template>
            </q-table>
        </q-card>
    </q-page>
</template>