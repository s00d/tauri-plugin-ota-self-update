import { siteEn } from './site.en'
import { siteRu } from './site.ru'
import type { DocSection, SiteContent, SiteLocale } from './types'

function hasSection(pageSections: DocSection[], heading: string): boolean {
  return pageSections.some((section) => section.heading.toLowerCase() === heading.toLowerCase())
}

function enrichSections(base: SiteContent, locale: SiteLocale): SiteContent {
  const labels =
    locale === 'ru'
      ? {
          purpose: 'Назначение',
          prerequisites: 'Перед началом',
          verify: 'Проверка результата',
          pitfalls: 'Типовые проблемы',
          production: 'Рекомендации для продакшена'
        }
      : {
          purpose: 'Purpose',
          prerequisites: 'Prerequisites',
          verify: 'Verification checklist',
          pitfalls: 'Common pitfalls',
          production: 'Production notes'
        }

  const cloned = structuredClone(base)
  const pageExtras: Record<string, DocSection[]> =
    locale === 'ru'
      ? {
          installation: [
            {
              heading: 'Пошаговая настройка',
              body: ['Установите зависимости, соберите API-пакет и подключите плагин в Rust и во фронтенде.'],
              code: {
                language: 'bash',
                title: 'Инициализация рабочего пространства',
                value: 'pnpm install\npnpm run build:api\npnpm --dir examples/tauri-app install'
              }
            },
            {
              heading: 'Частые вопросы',
              body: [],
              faq: [
                {
                  q: 'Нужен ли отдельный мобильный мост?',
                  a: 'Нет, основной OTA-рантайм реализован в Rust и используется кросс-платформенно.'
                },
                { q: 'Можно ли оставить только ручную установку?', a: 'Да, если требуется полный контроль над подключением.' }
              ]
            }
          ],
          'quick-start': [
            {
              heading: 'Ожидаемый вывод',
              body: ['При успешной проверке вы увидите новую версию и статус применения в логах.'],
              code: {
                language: 'ts',
                title: 'Минимальный логгинг',
                value:
                  'const update = await check();\nif (!update) console.info("No OTA update");\nelse console.info("Update version:", update.version);'
              }
            }
          ],
          'channels-lifecycle': [
            {
              heading: 'Стратегия отката',
              body: ['При инциденте переведите релиз в revoked и опубликуйте исправленную версию в том же канале.'],
              checklist: ['Пометить проблемный релиз как revoked', 'Опубликовать исправленную версию', 'Повторно проверить обновление на клиенте']
            }
          ],
          'plugin-config': [
            {
              heading: 'Безопасные значения по умолчанию',
              body: ['Используйте HTTPS baseUrl, ограниченный server token и минимальные значения timeout.'],
              table: {
                headers: ['Поле', 'Рекомендуемое значение'],
                rows: [
                  ['timeoutSecs', '10-30'],
                  ['activationPolicy', 'nextLaunch для консервативного UX'],
                  ['requestHeaders', 'Только необходимые сервисные заголовки']
                ]
              }
            }
          ],
          'js-rust-api': [
            {
              heading: 'Сценарии использования',
              body: ['Поддерживаются ручной сценарий интерфейса, тихое применение при старте и периодические проверки.'],
              checklist: ['Кнопка ручной проверки', 'Тихая проверка при старте', 'Периодическая проверка каждые 15-30 минут']
            }
          ],
          'publisher-modes': [
            {
              heading: 'Шаги валидации',
              body: ['После публикации проверьте manifest URL, индекс релизов и фактическую загрузку архива клиентом.'],
              checklist: ['Manifest доступен', 'Файл подписи опубликован', 'Клиент успешно скачивает архив']
            }
          ],
          'github-action': [
            {
              heading: 'Фрагмент процесса CI',
              body: ['Используйте action из Marketplace для публикации OTA-ассетов после сборки приложения.'],
              code: {
                language: 'yaml',
                title: 'Использование action',
                value:
                  '- uses: s00d/tauri-plugin-ota-self-update@v0.2.0\n  with:\n    release_status: released\n    target: github\n    version: ${{ github.ref_name }}'
              }
            }
          ],
          'server-dashboard': [
            {
              heading: 'Безопасность админ-операций',
              body: ['Любые опасные операции (revoke/delete) должны требовать подтверждения и журналирования.'],
              noteVariant: 'error',
              note: 'Никогда не выполняйте delete без backup releases.json и файлов канала.'
            }
          ],
          'openapi-swagger': [
            {
              heading: 'Требования к авторизации',
              body: ['Интерактивные эндпоинты требуют Authorization: Bearer <token> для маршрутов /api.'],
              code: {
                language: 'bash',
                title: 'Пример curl',
                value: 'curl -H "Authorization: Bearer $OTA_SERVER_TOKEN" http://localhost:9033/api/releases'
              }
            }
          ],
          troubleshooting: [
            {
              heading: 'Проблемы маршрутов и базового пути',
              body: ['Для GitHub Pages проверьте BASE_URL и SPA fallback, иначе docs-маршруты будут ломаться на refresh.']
            }
          ],
          recipes: [
            {
              heading: 'Канареечное внедрение через prerelease',
              body: ['Публикуйте prerelease в beta-канал и подключайте ограниченную аудиторию для канареечной проверки.']
            }
          ]
        }
      : {
          installation: [
            {
              heading: 'Step-by-step setup',
              body: ['Install dependencies, build API package, and wire plugin in both Rust and frontend.'],
              code: {
                language: 'bash',
                title: 'Workspace bootstrap',
                value: 'pnpm install\npnpm run build:api\npnpm --dir examples/tauri-app install'
              }
            },
            {
              heading: 'FAQ',
              body: [],
              faq: [
                {
                  q: 'Do I need a separate mobile bridge?',
                  a: 'No. The OTA runtime is Rust-first and shared across supported platforms.'
                },
                { q: 'Can I keep only manual install?', a: 'Yes, if you need strict explicit wiring control.' }
              ]
            }
          ],
          'quick-start': [
            {
              heading: 'Expected output',
              body: ['On successful checks you should see discovered version and apply status in logs.'],
              code: {
                language: 'ts',
                title: 'Minimal logging',
                value:
                  'const update = await check();\nif (!update) console.info("No OTA update");\nelse console.info("Update version:", update.version);'
              }
            }
          ],
          'channels-lifecycle': [
            {
              heading: 'Rollback strategy',
              body: ['On incidents, revoke the bad release and publish a hotfix in the same channel track.'],
              checklist: ['Mark broken release as revoked', 'Publish fixed version', 'Re-run client check flow']
            }
          ],
          'plugin-config': [
            {
              heading: 'Secure defaults',
              body: ['Use HTTPS baseUrl, scoped server tokens, and bounded timeout values.'],
              table: {
                headers: ['Field', 'Recommended value'],
                rows: [
                  ['timeoutSecs', '10-30'],
                  ['activationPolicy', 'nextLaunch for conservative UX'],
                  ['requestHeaders', 'Only required service headers']
                ]
              }
            }
          ],
          'js-rust-api': [
            {
              heading: 'Usage recipes',
              body: ['Support manual UX flow, silent startup apply, and periodic checks.'],
              checklist: ['Manual check button', 'Silent check on app boot', 'Interval checks every 15-30 min']
            }
          ],
          'publisher-modes': [
            {
              heading: 'Validation steps',
              body: ['After publish, validate manifest URL, release index, and real archive download from client side.'],
              checklist: ['Manifest reachable', 'Signature file published', 'Client downloads archive successfully']
            }
          ],
          'github-action': [
            {
              heading: 'Workflow snippet',
              body: ['Use the marketplace action to publish OTA assets after app build stage.'],
              code: {
                language: 'yaml',
                title: 'Action usage',
                value:
                  '- uses: s00d/tauri-plugin-ota-self-update@v0.2.0\n  with:\n    release_status: released\n    target: github\n    version: ${{ github.ref_name }}'
              }
            }
          ],
          'server-dashboard': [
            {
              heading: 'Admin safety',
              body: ['All destructive operations (revoke/delete) should require confirmation and audit logging.'],
              noteVariant: 'error',
              note: 'Never delete before backing up releases.json and channel files.'
            }
          ],
          'openapi-swagger': [
            {
              heading: 'Auth requirements',
              body: ['Interactive API operations require Authorization: Bearer <token> on /api routes.'],
              code: {
                language: 'bash',
                title: 'Curl example',
                value: 'curl -H "Authorization: Bearer $OTA_SERVER_TOKEN" http://localhost:9033/api/releases'
              }
            }
          ],
          troubleshooting: [
            {
              heading: 'Route/base issues',
              body: ['For GitHub Pages verify BASE_URL and SPA fallback, otherwise docs routes fail on refresh.']
            }
          ],
          recipes: [
            {
              heading: 'Canary with prerelease',
              body: ['Publish prerelease in beta channel and expose it to a limited canary cohort first.']
            }
          ]
        }
  for (const group of cloned.docs.groups) {
    for (const page of group.pages) {
      if (pageExtras[page.id]?.length) {
        page.sections.push(...pageExtras[page.id])
      }
      if (!hasSection(page.sections, labels.purpose)) {
        page.sections.unshift({
          heading: labels.purpose,
          body: [page.summary]
        })
      }
      if (!hasSection(page.sections, labels.prerequisites)) {
        page.sections.push({
          heading: labels.prerequisites,
          body: [
            locale === 'ru'
              ? 'Проверьте версии Node.js, pnpm и инструментов Rust, затем убедитесь, что зависимости установлены.'
              : 'Confirm Node.js, pnpm, and Rust toolchain versions, then install workspace dependencies.'
          ],
          checklist:
            locale === 'ru'
              ? ['Node.js 20+', 'pnpm 9.15.9+', 'Стабильный набор инструментов Rust', 'Рабочий проект Tauri v2']
              : ['Node.js 20+', 'pnpm 9.15.9+', 'Rust stable toolchain', 'Working Tauri v2 project']
        })
      }
      if (!hasSection(page.sections, labels.verify)) {
        page.sections.push({
          heading: labels.verify,
          body: [
            locale === 'ru'
              ? 'После настройки убедитесь, что команды сборки/публикации выполняются без ошибок, а версии появляются в ожидаемом месте назначения.'
              : 'After setup, verify build/publish commands run cleanly and versions appear in the expected target.'
          ],
          checklist:
            locale === 'ru'
              ? ['Команда завершилась без ошибок', 'Артефакты доступны в целевом хранилище', 'Клиент видит новую версию']
              : ['Command exits successfully', 'Artifacts are visible at target', 'Client detects newer version']
        })
      }
      if (!hasSection(page.sections, labels.pitfalls)) {
        page.sections.push({
          heading: labels.pitfalls,
          body: [
            locale === 'ru'
              ? 'Чаще всего проблемы связаны с неправильными env-переменными, несовпадением версий зависимостей или отсутствующими системными пакетами.'
              : 'Most failures come from wrong env variables, dependency version mismatch, or missing system packages.'
          ],
          noteVariant: 'warn',
          note:
            locale === 'ru'
              ? 'Начинайте диагностику с логов CI/локального сервера и проверьте channel + release_status.'
              : 'Start diagnostics from CI/server logs and verify channel + release_status.'
        })
      }
      if (!hasSection(page.sections, labels.production)) {
        page.sections.push({
          heading: labels.production,
          body: [
            locale === 'ru'
              ? 'Для продакшена используйте поэтапное внедрение, публикацию через draft и план отката со статусом revoked.'
              : 'For production, use staged rollouts, draft-first publishing, and a rollback plan with revoked status.'
          ],
          table: {
            headers: locale === 'ru' ? ['Практика', 'Зачем'] : ['Practice', 'Why'],
            rows:
              locale === 'ru'
                ? [['Draft перед release', 'Проверка перед выдачей всем клиентам'], ['Сегментация каналов', 'Снижение blast radius'], ['Сценарий revocation', 'Быстрый откат инцидента']]
                : [
                    ['Draft before release', 'Validate before exposing to all clients'],
                    ['Channel segmentation', 'Reduce blast radius'],
                    ['Revocation flow', 'Fast incident rollback path']
                  ]
          }
        })
      }
    }
  }
  return cloned
}

export function getSiteContent(locale: SiteLocale): SiteContent {
  return enrichSections(locale === 'ru' ? siteRu : siteEn, locale)
}
