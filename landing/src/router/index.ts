import { createRouter, createWebHistory } from 'vue-router'
import { normalizeLocale } from '../content/locales'

export const PAGE_KEYS = ['home', 'install', 'run', 'publish', 'action', 'server', 'troubleshooting'] as const

const pagePath = (key: string) => (key === 'home' ? '' : key)

const routes = [
  {
    path: '/:locale(en|ru)?',
    children: PAGE_KEYS.map((key) => ({
      path: pagePath(key),
      name: key,
      component: () => import('../views/PageView.vue'),
      meta: { pageKey: key }
    }))
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const locale = normalizeLocale(String(to.params.locale || 'en'))
  if (to.params.locale !== locale && locale === 'en') {
    return { ...to, params: { ...to.params, locale: undefined }, replace: true }
  }
  if (to.params.locale !== locale && locale !== 'en') {
    return { ...to, params: { ...to.params, locale }, replace: true }
  }
  return true
})
