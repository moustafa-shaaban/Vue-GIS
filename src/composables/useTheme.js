import { useDark, useToggle } from '@vueuse/core'

export function useTheme() {
    const isDark = useDark({
        selector: 'html',
        attribute: 'class',
        valueDark: 'theme--dark',
        valueLight: 'theme--light',
    })

    const toggleTheme = useToggle(isDark)

    return { isDark, toggleTheme }
}