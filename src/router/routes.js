const routes = [
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    children: [
      {
        name: "home",
        path: "",
        component: () => import("@/pages/IndexPage.vue"),
      },
      {
        name: "places",
        path: "places",
        component: () => import("@/pages/PlacesPage.vue"),
      },
      {
        name: "settings",
        path: "settings",
        component: () => import("@/pages/SettingsPage.vue"),
      },
      {
        name: "about",
        path: "about",
        component: () => import("@/pages/AboutPage.vue"),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("@/pages/ErrorNotFound.vue"),
  },
];

export default routes;
