import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
    state: () => ({
        //language: 'en',
        sideBar: false,
    }),
    persist: true,
    actions: {
        // setLanguage(lang) {
        //   this.language = lang
        // },
        toggleSideBar() {
            this.sideBar = !this.sideBar
        },
    },
})