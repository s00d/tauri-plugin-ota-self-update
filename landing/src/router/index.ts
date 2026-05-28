import { createRouter, createWebHistory } from 'vue-router'
import { normalizeLocale } from '../content/locales'

const routes = [
  {
    path: '/:locale(en|ru)?',
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/HomeView.vue')
      },
      {
        path: 'docs/:slug?',
        name: 'docs',
        component: () => import('../views/DocsView.vue')
      }
    ]
  }
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth', top: 92 }
    }
    return { top: 0, left: 0, behavior: 'auto' }
  }
})

router.beforeEach((to) => {
  const rawLocale = typeof to.params.locale === 'string' ? to.params.locale : undefined
  if (!rawLocale) return true

  const locale = normalizeLocale(rawLocale)
  if (rawLocale !== locale && locale === 'en') {
    return { ...to, params: { ...to.params, locale: undefined }, replace: true }
  }
  if (rawLocale !== locale && locale === 'ru') {
    return { ...to, params: { ...to.params, locale }, replace: true }
  }
  return true
})
