import type { SiteContent } from './types'

export const siteRu: SiteContent = {
  brand: 'Tauri OTA Self Update',
  navHome: 'Главная',
  navDocs: 'Документация',
  marketing: {
    badge: 'Самостоятельно размещаемые OTA-обновления для Tauri v2',
    title: 'Доставляйте фронтенд-обновления без отправки в сторы',
    subtitle:
      'Готовый набор для продакшена: Rust-плагин, JS API, action публикации и собственный сервер с панелью управления релизами.',
    primaryCta: 'Открыть документацию',
    secondaryCta: 'Открыть GitHub',
    highlights: [
      'Каналы stable/beta с жёстким разделением предварительных релизов',
      'Публикация в GitHub, S3 и на собственный сервер',
      'Жизненный цикл релизов: draft -> released -> revoked',
      'Панель управления + OpenAPI + Swagger для эксплуатации'
    ],
    features: [
      {
        title: 'Единый рантайм на Rust',
        description: 'Единый рантайм для настольных и мобильных платформ с явными API check/apply.'
      },
      {
        title: 'Гибкая доставка',
        description: 'Используйте GitHub Releases, S3-совместимые хранилища или собственный сервер.'
      },
      {
        title: 'Прозрачная эксплуатация',
        description: 'Управляйте релизами из панели и проверяйте API через Swagger.'
      }
    ]
  },
  docs: {
    docsTitle: 'Документация',
    docsIntro:
      'Древовидная документация для продакшена: архитектура, API, CI/CD, серверная эксплуатация, диагностика и сценарии поэтапного внедрения.',
    groups: [
      {
        id: 'getting-started',
        title: 'Старт',
        pages: [
          {
            id: 'installation',
            title: 'Установка',
            summary: 'Автоматическая и ручная установка Rust + JavaScript пакетов.',
            sections: [
              {
                heading: 'Автоустановка (рекомендуется)',
                body: ['Выполняйте из корня вашего Tauri-приложения.'],
                code: { language: 'bash', value: 'pnpm run tauri add ota-self-update' }
              },
              {
                heading: 'Ручная установка',
                body: ['Подключите crate/API вручную и инициализируйте плагин на этапе настройки сборщика.'],
                bullets: [
                  'Cargo.toml: tauri-plugin-ota-self-update = "0.1"',
                  'Пакет фронтенда: tauri-plugin-ota-self-update-api',
                  'Вызов init(...) перед run(context)'
                ]
              },
              {
                heading: 'Базовый набор инструментов',
                body: ['Зафиксируйте версии инструментов, чтобы локальная и CI-сборка вели себя одинаково.'],
                table: {
                  headers: ['Компонент', 'Рекомендуется'],
                  rows: [
                    ['Node.js', '20+'],
                    ['pnpm', '9.15.9+'],
                    ['Rust', 'stable'],
                    ['Tauri', 'v2']
                  ]
                }
              },
              {
                heading: 'Платформенные требования',
                body: ['Перед валидацией OTA установите системные зависимости для целевых платформ.'],
                bullets: [
                  'Linux: glib/gobject/pkg-config пакеты в CI',
                  'Windows: обязательные компоненты среды выполнения',
                  'macOS: Xcode command line tools',
                  'Мобильные цели: Android SDK / Xcode при проверке сборки приложения'
                ]
              },
              {
                heading: 'Пример подключения Rust',
                body: ['Инициализируйте плагин до вызова run(context).'],
                code: {
                  language: 'rust',
                  value:
                    'tauri::Builder::default()\n  .plugin(tauri_plugin_ota_self_update::init(config))\n  .run(tauri::generate_context!())\n  .expect("error while running tauri app");'
                }
              },
              {
                heading: 'Пример подключения во фронтенде',
                body: ['Вызывайте выбор канала и check/apply в сценарии запуска или на экране настроек.'],
                code: {
                  language: 'ts',
                  value:
                    'import { check, setChannel } from "tauri-plugin-ota-self-update-api";\n\nawait setChannel("stable");\nconst update = await check();\nif (update) await update.apply();'
                }
              },
              {
                heading: 'Проверка установки',
                body: ['Проверьте доступность baseUrl, корректность ключа подписи и первый запуск проверки обновлений.'],
                checklist: ['baseUrl отдает manifest', 'pubkey совпадает с ключом подписи', 'check выполняется без ошибок выполнения']
              },
              {
                heading: 'Антипаттерны установки',
                body: ['Чаще всего ломается неполное подключение Rust и фронтенд-части.'],
                bullets: [
                  'JS пакет установлен, но Rust плагин не инициализирован',
                  'В продакшене используется HTTP вместо HTTPS',
                  'Смешаны артефакты предварительных релизов и stable-клиенты'
                ]
              }
            ]
          },
          {
            id: 'quick-start',
            title: 'Быстрый старт',
            summary: 'Минимальный сценарий check/apply с выбором канала и логикой перезагрузки.',
            sections: [
              {
                heading: 'Фронтенд сценарий',
                body: ['Выберите канал, вызовите check, затем apply при наличии обновления.'],
                code: {
                  language: 'ts',
                  value:
                    'import { check, setChannel } from "tauri-plugin-ota-self-update-api";\n\nawait setChannel("stable");\nconst update = await check();\nif (update) {\n  const result = await update.apply();\n  if (result.status === "appliedNow") location.reload();\n}'
                }
              },
              {
                heading: 'Периодическая автопроверка',
                body: ['Запускайте проверку при старте и затем по интервалу.'],
                bullets: ['Один раз при старте', 'Повтор каждые 15-30 минут', 'Ошибки логировать без блокировки интерфейса']
              },
              {
                heading: 'Локальный запуск примера',
                body: ['Используйте пример приложения для быстрой сквозной проверки.'],
                code: {
                  language: 'bash',
                  value: 'pnpm run example:dev'
                }
              },
              {
                heading: 'Запуск OTA-сервера',
                body: ['Поднимите локальный собственный сервер с токеном.'],
                code: {
                  language: 'bash',
                  value: 'OTA_SERVER_TOKEN=dev-token pnpm run server:start'
                }
              },
              {
                heading: 'Первая публикация',
                body: ['Опубликуйте первый stable OTA-пакет в выбранный источник доставки.'],
                code: {
                  language: 'bash',
                  value:
                    'OTA_PUBLISH_MODE=server OTA_CHANNEL=stable OTA_VERSION=0.2.0 OTA_BASE_URL=http://localhost:9033 OTA_SERVER_TOKEN=dev-token pnpm run ota:publish'
                }
              },
              {
                heading: 'Проверка процесса обновления',
                body: ['Установите более старую версию приложения и убедитесь, что обновление находится и применяется.'],
                checklist: ['Текущая версия видна в UI', 'Новая версия обнаружена', 'apply() возвращает ожидаемый статус']
              },
              {
                heading: 'Ожидаемые логи',
                body: ['Фиксируйте одинаковый формат логов для локальной и CI проверочной прогонки.'],
                code: {
                  language: 'text',
                  value: 'check: found update 0.2.0\napply: status=appliedNow\nactivation: softReload -> location.reload()'
                }
              },
              {
                heading: 'Сценарий тихого старта',
                body: ['Применяйте обновление на старте приложения с безопасной обработкой ошибок.'],
                code: {
                  language: 'ts',
                  value:
                    'async function silentOtaBoot() {\n  try {\n    const update = await check();\n    if (!update) return;\n    const result = await update.apply();\n    if (result.status === "appliedNow") location.reload();\n  } catch (e) {\n    console.warn("OTA silent check failed", e);\n  }\n}'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'core-concepts',
        title: 'Базовые концепции',
        pages: [
          {
            id: 'channels-lifecycle',
            title: 'Каналы и жизненный цикл релиза',
            summary: 'Как stable/beta и статусы релизов влияют на выбор обновления.',
            sections: [
              {
                heading: 'Правила каналов',
                body: ['stable берет released non-prerelease, beta берет released prerelease.'],
                bullets: ['release -> release', 'pre-release -> pre-release', 'межтрековые обновления запрещены']
              },
              {
                heading: 'Статусы релиза',
                body: ['draft/released/revoked управляют видимостью версии для клиентов.']
              },
              {
                heading: 'Ограничения предварительных релизов',
                body: ['Рантайм блокирует межтрековые переходы, чтобы исключить утечку нестабильных обновлений.'],
                bullets: ['release -> release', 'pre-release -> pre-release', 'несовпадение трека отклоняется']
              },
              {
                heading: 'Продвижение beta -> stable',
                body: ['Продвигайте в stable только проверенную beta-версию после периода наблюдения.'],
                checklist: ['beta-валидация пройдена', 'нет блокирующих регрессий', 'stable manifest обновлен']
              },
              {
                heading: 'Сценарий отката',
                body: ['При инциденте отзовите проблемный релиз и выпустите исправление в том же канале.'],
                code: {
                  language: 'bash',
                  value: 'POST /api/releases/:channel/:version/revoke'
                }
              },
              {
                heading: 'Управление жизненным циклом',
                body: ['Изменение статусов релизов должно быть контролируемой операцией.'],
                table: {
                  headers: ['Статус', 'Видимость клиенту', 'Назначение'],
                  rows: [
                    ['draft', 'нет', 'валидация'],
                    ['released', 'да', 'массовое внедрение'],
                    ['revoked', 'нет', 'остановка инцидента']
                  ]
                }
              }
            ]
          },
          {
            id: 'activation-policy',
            title: 'Политика активации',
            summary: 'Поведение nextLaunch и softReload после apply().',
            sections: [
              { heading: 'nextLaunch', body: ['Активация на следующем запуске приложения.'] },
              { heading: 'softReload', body: ['Активация сразу, при необходимости перезагрузки интерфейса.'] }
            ]
          }
        ]
      },
      {
        id: 'api-config',
        title: 'Конфиг и API',
        pages: [
          {
            id: 'plugin-config',
            title: 'Справочник конфигурации плагина',
            summary: 'Назначение baseUrl, pubkey, channel, headers, timeout и activationPolicy.',
            sections: [
              {
                heading: 'Поля конфигурации',
                body: ['baseUrl указывает на GitHub repo, S3/CDN URL или custom server endpoint.'],
                bullets: ['pubkey', 'requestHeaders', 'timeoutSecs', 'activationPolicy']
              }
            ]
          },
          {
            id: 'js-rust-api',
            title: 'JavaScript и Rust API',
            summary: 'Детали использования JS-методов и расширения Rust.',
            sections: [
              {
                heading: 'JS API',
                body: ['Методы: setChannel, check, checkWithMeta, Update.apply.']
              },
              {
                heading: 'Rust API',
                body: ['Вызов app.ota_self_update() из команд/плагинов на стороне Rust.']
              }
            ]
          }
        ]
      },
      {
        id: 'publishing-cicd',
        title: 'Публикация и CI/CD',
        pages: [
          {
            id: 'publisher-modes',
            title: 'Режимы публикации (GitHub / S3 / Server)',
            summary: 'Матрица переменных окружения и семантика release_status по режимам публикации.',
            sections: [
              {
                heading: 'Переменные окружения',
                body: ['Выберите режим и передайте целевые учетные данные/токены.'],
                bullets: ['OTA_PUBLISH_MODE', 'OTA_VERSION', 'OTA_CHANNEL', 'OTA_RELEASE_STATUS']
              },
              {
                heading: 'Процесс release_status',
                body: ['Сначала публикуйте draft, проверяйте, затем подтверждайте релиз до статуса released.']
              },
              {
                heading: 'Проверка режима GitHub',
                body: ['Публикует manifest и bundle как release assets в целевом репозитории.'],
                checklist: ['Релиз существует', 'Токен имеет права на релизы', 'stable.json или beta.json загружен']
              },
              {
                heading: 'Проверка режима S3',
                body: ['Хранит release-файлы в bucket layout с индексом версий.'],
                checklist: ['Есть права записи в bucket', 'Индекс можно обновить', 'Публичный путь совпадает с baseUrl']
              },
              {
                heading: 'Проверка серверного режима',
                body: ['Загружает артефакты на self-host сервер с Bearer-токеном.'],
                checklist: ['OTA_BASE_URL корректный', 'OTA_SERVER_TOKEN валиден', 'эндпоинты загрузки отвечают 2xx']
              },
              {
                heading: 'Структура артефактов',
                body: ['Во всех режимах используется один и тот же набор артефактов.'],
                table: {
                  headers: ['Артефакт', 'Назначение'],
                  rows: [
                    ['stable.json / beta.json', 'manifest канала'],
                    ['bundle.tar.gz', 'архив веб-ресурсов'],
                    ['bundle.tar.gz.minisig', 'криптографическая подпись']
                  ]
                }
              },
              {
                heading: 'Шаблон команды',
                body: ['Держите базовые переменные окружения неизменными, меняйте только значения выбранного источника.'],
                code: {
                  language: 'bash',
                  value:
                    'OTA_PUBLISH_MODE=github|s3|server\nOTA_VERSION=0.2.0\nOTA_CHANNEL=stable|beta\nOTA_RELEASE_STATUS=draft|released|revoked'
                }
              },
              {
                heading: 'Клиентская валидация после публикации',
                body: ['После загрузки проверяйте результат глазами клиента, а не только по логам загрузчика.'],
                checklist: ['manifest URL возвращает 200', 'файл подписи существует', 'клиент видит опубликованную версию']
              }
            ]
          },
          {
            id: 'github-action',
            title: 'Справочник GitHub Action',
            summary: 'Входы action, релизные шаблоны и стратегия тегов.',
            sections: [
              {
                heading: 'Рекомендуемый конвейер',
                body: ['Собирайте бинарные файлы через tauri-action и OTA-ассеты через этот action в одном процессе CI.']
              },
              {
                heading: 'Справочник входных параметров',
                body: ['Рассматривайте inputs как CI-контракт между сборкой и публикацией.'],
                table: {
                  headers: ['Input', 'Роль'],
                  rows: [
                    ['target', 'режим провайдера публикации'],
                    ['version', 'версия OTA-релиза'],
                    ['channel', 'stable или beta'],
                    ['release_status', 'draft/released/revoked']
                  ]
                }
              },
              {
                heading: 'Фрагмент dry-run',
                body: ['Используйте для проверки подключения перед первым боевым релизом.'],
                code: {
                  language: 'yaml',
                  value: 'with:\n  dry_run: true\n  channel: stable\n  release_status: draft'
                }
              },
              {
                heading: 'Фрагмент release',
                body: ['Переключайте dry_run=false только после проверочной прогонки.'],
                code: {
                  language: 'yaml',
                  value: 'with:\n  dry_run: false\n  release_status: released'
                }
              },
              {
                heading: 'Стратегия тегов',
                body: ['Используйте семантические теги для детерминированных релизов и удобного rollback.']
              },
              {
                heading: 'Проблемы CI-матрицы',
                body: ['Чаще всего падения связаны с системными зависимостями или дрейфом версий.'],
                bullets: [
                  'Linux: отсутствуют glib/pkg-config пакеты',
                  'Windows: конфигурация среды выполнения/подписи не совпадает',
                  'macOS: отсутствуют Xcode/notarization prerequisites'
                ]
              },
              {
                heading: 'Заметки по безопасности CI',
                body: ['Применяйте минимально необходимые права и не выводите секреты в логах.'],
                checklist: ['Только scoped tokens', 'Маскирование чувствительных переменных окружения', 'Не печатать auth headers в debug']
              }
            ]
          }
        ]
      },
      {
        id: 'server-ops',
        title: 'Сервер и эксплуатация',
        pages: [
          {
            id: 'server-dashboard',
            title: 'Панель сервера и авторизация',
            summary: 'Token-middleware, операции в панели и подтверждение релизов.',
            sections: [
              {
                heading: 'Готовый сервер уже есть в репозитории',
                body: [
                  'Ничего писать с нуля не нужно: в проекте уже есть готовый self-host OTA сервер на Express.',
                  'Готовые файлы: server/ota-server.cjs (сборка), scripts-src/ota-server.ts (исходник), server/Dockerfile и server/docker-compose.yml.'
                ],
                checklist: ['Сервер отдает manifest и archive', 'Есть панель управления', 'Есть OpenAPI и Swagger', 'Есть token-based защита']
              },
              {
                heading: 'Как быстро запустить локально',
                body: ['Минимальный запуск сервера из текущего репозитория:'],
                code: {
                  language: 'bash',
                  value:
                    'OTA_SERVER_TOKEN=super-secret \\\nPORT=8080 \\\nOTA_DATA_DIR=.ota-server-data \\\npnpm run build:scripts && node server/ota-server.cjs'
                }
              },
              {
                heading: 'Запуск готового сервера через docker compose',
                body: ['В каталоге server уже есть готовый compose-файл.'],
                code: {
                  language: 'bash',
                  value: 'cd server\nOTA_SERVER_TOKEN=super-secret docker compose up -d --build'
                }
              },
              {
                heading: 'API получения обновлений (клиентский путь)',
                body: [
                  'Клиент OTA при проверке обновления использует публичные GET-маршруты сервера.',
                  'Для чтения обновлений токен не нужен, токен требуется только для upload/admin операций.'
                ],
                table: {
                  headers: ['Маршрут', 'Назначение'],
                  rows: [
                    ['GET /manifest/:channel.json', 'Получить manifest канала (stable/beta)'],
                    ['GET /releases.json', 'Получить индекс релизов со статусами'],
                    ['GET /:channel/:archive', 'Скачать архив обновления'],
                    ['GET /healthz', 'Проверка живости сервера']
                  ]
                }
              },
              {
                heading: 'Минимальная проверка API вручную',
                body: ['Проверьте, что сервер реально отдает данные для OTA-клиента:'],
                code: {
                  language: 'bash',
                  value:
                    'curl http://127.0.0.1:8080/healthz\ncurl http://127.0.0.1:8080/manifest/stable.json\ncurl http://127.0.0.1:8080/releases.json'
                }
              },
              {
                heading: 'Как запустить через Docker',
                body: ['Для серверной среды можно использовать готовый Dockerfile без доработок.'],
                code: {
                  language: 'bash',
                  value:
                    'docker build -t ota-self-update-server -f server/Dockerfile server\n\ndocker run --rm -p 8080:8080 \\\n  -e OTA_SERVER_TOKEN=super-secret \\\n  -e OTA_DATA_DIR=/data/ota \\\n  -v \"$(pwd)/.ota-server-data:/data/ota\" \\\n  ota-self-update-server'
                }
              },
              {
                heading: 'Что умеет сервер из коробки',
                body: ['Сервер поддерживает полный цикл публикации и управления релизами.'],
                table: {
                  headers: ['Возможность', 'Статус'],
                  rows: [
                    ['Подача манифестов и архивов OTA', 'Готово'],
                    ['Token auth для admin/upload маршрутов', 'Готово'],
                    ['Панель управления релизами', 'Готово'],
                    ['OpenAPI и Swagger', 'Готово'],
                    ['Статусы draft/released/revoked', 'Готово']
                  ]
                }
              },
              {
                heading: 'Модель авторизации',
                body: ['Все /api маршруты требуют Bearer токен из OTA_SERVER_TOKEN.']
              }
            ]
          },
          {
            id: 'openapi-swagger',
            title: 'OpenAPI и Swagger',
            summary: 'Контракт API в формате OpenAPI и интерактивном Swagger UI.',
            sections: [
              {
                heading: 'Документационные эндпоинты',
                body: ['Используйте /openapi.json и /docs для инспекции API.']
              }
            ]
          }
        ]
      },
      {
        id: 'troubleshooting-recipes',
        title: 'Диагностика и рецепты',
        pages: [
          {
            id: 'troubleshooting',
            title: 'Диагностика проблем',
            summary: 'Частые ошибки CI/выполнения и проверенные пути исправления.',
            sections: [
              {
                heading: 'Типовые ошибки',
                body: ['glib/pkg-config, несовпадение pnpm, bundle identifier, отсутствующий manifest asset.']
              },
              {
                heading: 'Ошибки bundle identifier',
                body: ['Замените дефолтный com.tauri.dev в tauri-конфиге перед release-сборками.']
              },
              {
                heading: 'Проблемы маршрутизации landing',
                body: ['Проверьте BASE_URL роутера и SPA fallback для корректного refresh на GitHub Pages.']
              },
              {
                heading: 'Ошибки авторизации сервера',
                body: ['401/403 обычно означает неверный OTA_SERVER_TOKEN или отсутствие Authorization header.']
              },
              {
                heading: 'Версия опубликована, но не выбирается',
                body: ['Проверьте status, channel и флаг prerelease относительно клиентского трека.']
              },
              {
                heading: 'Сценарий: обновление не находится',
                body: ['Выполняйте диагностику по фиксированной последовательности.'],
                checklist: [
                  'Проверить текущую версию приложения и канал',
                  'Запросить manifest напрямую через curl/browser',
                  'Проверить releases index на статус released',
                  'Проверить доступность архива и подписи (200)'
                ]
              },
              {
                heading: 'Сценарий: CI-публикация падает',
                body: ['Начинайте с первого упавшего job и сверяйте env-матрицу с документацией.'],
                checklist: [
                  'Проверить совпадение версий pnpm/action',
                  'Проверить системные пакеты Linux в workflow',
                  'Проверить права доступа к целевому источнику публикации'
                ]
              }
            ]
          },
          {
            id: 'recipes',
            title: 'Операционные рецепты',
            summary: 'Практические паттерны поэтапного внедрения для продакшен-команд.',
            sections: [
              {
                heading: 'Поэтапное внедрение',
                body: ['Публикуйте beta prerelease, валидируйте, затем продвигайте stable-релиз.']
              }
            ]
          }
        ]
      }
    ]
  }
}
