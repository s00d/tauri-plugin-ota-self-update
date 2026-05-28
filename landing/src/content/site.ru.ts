import type { SiteContent } from './types'

export const siteRu: SiteContent = {
  brand: 'Tauri OTA Self Update',
  cta: 'Открыть GitHub',
  nav: {
    home: 'Главная',
    install: 'Установка',
    run: 'Запуск',
    publish: 'Публикация',
    action: 'GitHub Action',
    server: 'Сервер',
    troubleshooting: 'Проблемы'
  },
  pages: {
    home: {
      title: 'Селф-хост OTA обновления для Tauri',
      description:
        'Проект включает Rust-плагин, JavaScript API, action для публикации и сервер с dashboard для доставки веб-обновлений без релиза в сторах.',
      bullets: [
        'Каналы: stable и beta с разделением pre-release логики.',
        'Цели публикации: GitHub Releases, S3 и собственный HTTP сервер.',
        'Lifecycle релизов: draft, released, revoked, delete с подтверждением.',
        'Встроенный dashboard и Swagger UI для операционной работы.'
      ]
    },
    install: {
      title: 'Инструкция по установке',
      description: 'Подключите Rust crate и JavaScript API, затем настройте плагин в tauri.conf.json.',
      bullets: [
        'Добавьте `tauri-plugin-ota-self-update` в Cargo.toml.',
        'Добавьте `tauri-plugin-ota-self-update-api` в package.json фронтенда.',
        'Инициализируйте плагин в setup Tauri builder.',
        'Настройте baseUrl/channel/pubkey/request headers в конфиге плагина.'
      ]
    },
    run: {
      title: 'Локальный запуск и тест',
      description: 'Используйте example app, server mode и авторизацию dashboard для e2e проверки OTA цепочки.',
      bullets: [
        'Запуск примера: `pnpm run example:dev` из корня репозитория.',
        'Запуск сервера: `pnpm run server:start` с OTA_SERVER_TOKEN.',
        'Публикация тестового ассета: `pnpm run ota:publish` в режиме server.',
        'Проверяйте версию приложения и сценарий check/apply update.'
      ]
    },
    publish: {
      title: 'Публикация обновлений',
      description: 'Используйте bundled publisher script или reusable GitHub Action в CI/CD.',
      bullets: [
        'Задайте `OTA_PUBLISH_MODE`: github, s3 или server.',
        'Укажите `OTA_RELEASE_STATUS`: draft/released/revoked.',
        'Поддержаны подписи манифеста и архива для production.',
        'Индекс `releases.json` обновляется автоматически.'
      ]
    },
    action: {
      title: 'Использование GitHub Action',
      description: 'Composite action поддерживает все режимы публикации и dry-run для проверки связки.',
      bullets: [
        'Входы: mode, version, channel, target repo, bucket, server token.',
        'Через `release_status` можно публиковать draft и подтверждать через dashboard.',
        'Комбинируется с tauri-apps/tauri-action для бинарей и OTA ассетов.',
        'Workflow по тегам версии (`v*`) подходит для релизного потока.'
      ]
    },
    server: {
      title: 'Селф-хост сервер и dashboard',
      description: 'Express сервер с token middleware, dashboard UI и интерактивной API документацией.',
      bullets: [
        'Dashboard: авторизация по токену и управление lifecycle релизов.',
        'Swagger UI: `/docs`, OpenAPI JSON: `/openapi.json`.',
        'Готовы Docker и docker-compose конфиги.',
        'API и OTA файлы сохраняются в директории данных сервера.'
      ]
    },
    troubleshooting: {
      title: 'Диагностика проблем и CI',
      description: 'Собраны типовые ошибки и практичные пути исправления.',
      bullets: [
        'Ошибки glib/pkg-config в CI: установить Linux системные библиотеки до cargo check.',
        'Конфликт версии pnpm в GitHub Action: синхронизировать с `packageManager`.',
        'Ошибка bundle identifier в Tauri: не использовать `com.tauri.dev`.',
        'Ошибка резолва API в примере: собирать API пакет до сборки example.'
      ]
    }
  }
}
