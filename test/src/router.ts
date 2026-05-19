import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('./views/Home.vue')
    },
    {
      path: '/full-test',
      name: 'FullTest',
      component: () => import('./views/FullTest.vue')
    },
    {
      path: '/core-test',
      name: 'CoreTest',
      component: () => import('./CoreTestApp.vue')
    }
  ]
})

export default router
