<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { fieldSchema } from '@/schemas'
import { useCurrentLocation } from '@/composables/useCurrentLocation';
import { errorNotification } from '@/utils/notifications';

const props = defineProps({
    form: { type: Object, required: true }, // the object returned by useForm()
    editing: { type: Boolean, default: false },
    sheet: { type: Boolean, default: false }, // true when shown inside the mobile bottom sheet
})

const emit = defineEmits(['cancel', 'close'])

const $q = useQuasar()
const form = props.form // stable instance; lets the template use <form.Field>

// `dense` inputs are ~40px tall; on touch screens use the regular 56px size
const dense = computed(() => !$q.screen.lt.md)
const { locating, getCurrentLocation } = useCurrentLocation();

async function fillCurrentLocation() {
    try {
        const { lat, lng } = await getCurrentLocation();
        form.setFieldValue('latitude', Number(lat.toFixed(6)))
        form.setFieldValue('longitude', Number(lng.toFixed(6)))
        // validators are onBlur-only, so clear any stale "required" errors
        form.validateField('latitude', 'blur')
        form.validateField('longitude', 'blur')
    } catch (error) {
        errorNotification(error.message)
    }
}

function submit() {
    form.handleSubmit()
}

function errorMessage(field) {
    return field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]
}
</script>

<template>
    <q-card :flat="!sheet" :bordered="!sheet" class="column no-wrap feature-form-card" :class="{ 'is-sheet': sheet }">
        <div v-if="sheet" class="sheet-handle"></div>

        <q-toolbar class="col-auto">
            <q-icon :name="editing ? 'edit_location' : 'add_location'" size="sm" class="q-mr-sm" />
            <q-toolbar-title>{{ editing ? 'Edit Feature' : 'Add Feature' }}</q-toolbar-title>
            <q-btn v-if="sheet" flat round icon="close" @click="emit('close')" />
        </q-toolbar>

        <q-separator />

        <!-- Scrollable body: stays usable when the on-screen keyboard is open -->
        <q-card-section class="col scroll">
            <q-form @submit.prevent="submit" class="column q-gutter-md">
                <form.Field name="title" :validators="{ onBlur: fieldSchema.title }">
                    <template #default="{ field }">
                        <q-input :dense="dense" outlined stack-label :model-value="field.state.value"
                            @update:model-value="field.handleChange" @blur="field.handleBlur" label="Title"
                            placeholder="Cafe.." :disable="form.state.isSubmitting"
                            :error="field.state.meta.errors.length > 0" :error-message="errorMessage(field)">
                            <template #prepend><q-icon name="label" /></template>
                        </q-input>
                    </template>
                </form.Field>

                <form.Field name="description" :validators="{ onBlur: fieldSchema.description }">
                    <template #default="{ field }">
                        <q-input :dense="dense" outlined stack-label type="textarea" autogrow
                            :model-value="field.state.value" @update:model-value="field.handleChange"
                            @blur="field.handleBlur" label="Description" placeholder="My favorite cafe"
                            :disable="form.state.isSubmitting" :error="field.state.meta.errors.length > 0"
                            :error-message="errorMessage(field)">
                            <template #prepend><q-icon name="notes" /></template>
                        </q-input>
                    </template>
                </form.Field>
                <q-btn outline no-caps color="secondary" icon="my_location" label="Use my location" class="full-width"
                    :loading="locating" :disable="form.state.isSubmitting" @click="fillCurrentLocation" />
                <!-- Side by side: saves vertical space, which matters with the keyboard open -->
                <div class="row q-col-gutter-sm">
                    <div class="col-6">
                        <form.Field name="latitude" :validators="{ onBlur: fieldSchema.latitude }">
                            <template #default="{ field }">
                                <q-input :dense="dense" outlined stack-label type="number" step="any"
                                    inputmode="decimal" :model-value="field.state.value"
                                    @update:model-value="field.handleChange" @blur="field.handleBlur" label="Latitude"
                                    placeholder="70.123456" :disable="form.state.isSubmitting"
                                    :error="field.state.meta.errors.length > 0" :error-message="errorMessage(field)" />
                            </template>
                        </form.Field>
                    </div>
                    <div class="col-6">
                        <form.Field name="longitude" :validators="{ onBlur: fieldSchema.longitude }">
                            <template #default="{ field }">
                                <q-input :dense="dense" outlined stack-label type="number" step="any"
                                    inputmode="decimal" :model-value="field.state.value"
                                    @update:model-value="field.handleChange" @blur="field.handleBlur" label="Longitude"
                                    placeholder="-20.123456" :disable="form.state.isSubmitting"
                                    :error="field.state.meta.errors.length > 0" :error-message="errorMessage(field)" />
                            </template>
                        </form.Field>
                    </div>
                </div>
            </q-form>
        </q-card-section>

        <q-separator />

        <!-- Pinned actions: Save sits at the right, where the thumb is -->
        <q-card-actions class="col-auto q-pa-md card-actions">
            <!-- form.reset() must be CALLED. `@click="form.reset"` passes the click event in as new default values -->
            <q-btn flat no-caps color="grey-8" icon="restart_alt" label="Reset" @click="form.reset()" />
            <q-space />
            <q-btn v-if="editing" flat no-caps color="grey-8" label="Cancel" @click="emit('cancel')" />
            <form.Subscribe>
                <template v-slot="{ canSubmit, isSubmitting }">
                    <q-btn unelevated no-caps color="primary" icon="save" :disable="!canSubmit" :loading="isSubmitting"
                        :label="editing ? 'Update' : 'Save'" @click="submit" />
                </template>
            </form.Subscribe>
        </q-card-actions>
    </q-card>
</template>

<style scoped>
.feature-form-card.is-sheet {
    width: 100%;
    max-height: 90dvh;
    border-radius: 16px 16px 0 0;
}

.card-actions {
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.sheet-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: rgba(128, 128, 128, 0.5);
    margin: 8px auto 0;
}
</style>