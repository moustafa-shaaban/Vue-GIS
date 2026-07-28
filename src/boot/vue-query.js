import { defineBoot } from '#q-app'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

export default defineBoot(({ app }) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 30, // Data stays "fresh" for 30 minutes
                gcTime: 1000 * 60 * 10, // Unused data is removed after 10 minutes
                retry: 2,
                refetchOnWindowFocus: false,
            },
            mutations: {
                retry: 1,
            },
        },
    })
    app.use(VueQueryPlugin, { queryClient })
})