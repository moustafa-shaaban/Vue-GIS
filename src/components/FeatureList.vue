<script setup>
defineProps({
    features: { type: Array, default: () => [] }
});

const search = defineModel('search', { default: '' });

defineEmits(['add', 'select', 'edit', 'remove']);
</script>

<template>
    <div class="column no-wrap fit">
        <q-toolbar class="col-auto">
            <q-toolbar-title>Features ({{ features.length }})</q-toolbar-title>
            <q-btn flat no-caps label="Add" icon="add" @click="$emit('add')" />
        </q-toolbar>

        <div class="col-auto q-px-sm q-pb-sm">
            <q-input v-model="search" dense filled clearable placeholder="Search features...">
                <template #prepend>
                    <q-icon name="search" />
                </template>
            </q-input>
        </div>

        <q-separator />

        <div class="col scroll">
            <q-list separator>
                <q-item v-if="features.length === 0" class="q-pa-md text-center">
                    <q-item-section class="text-grey">No matching features found.</q-item-section>
                </q-item>

                <q-item v-for="feature in features" :key="feature.id" clickable v-ripple
                    @click="$emit('select', feature)">
                    <q-item-section avatar>
                        <q-icon name="place" color="primary" />
                    </q-item-section>

                    <q-item-section>
                        <q-item-label class="text-weight-bold ellipsis">{{ feature.title }}</q-item-label>
                        <q-item-label v-if="feature.description" caption lines="1">{{ feature.description
                            }}</q-item-label>
                    </q-item-section>

                    <q-item-section side>
                        <div class="row no-wrap">
                            <q-btn flat round icon="edit" color="primary" @click.stop="$emit('edit', feature)" />
                            <q-btn flat round icon="delete" color="negative"
                                @click.stop="$emit('remove', feature.id)" />
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>
        </div>
    </div>
</template>