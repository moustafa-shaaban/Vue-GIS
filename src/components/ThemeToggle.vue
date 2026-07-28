<script setup>
import { useTheme } from '@/composables/useTheme';
const { isDark, toggleTheme } = useTheme();
</script>

<template>
    <q-btn flat dense :label="isDark ? 'Light' : 'Dark'" :icon="isDark ? 'light_mode' : 'dark_mode'"
        @click="toggleTheme()"></q-btn>
</template>