import { invoke } from '@tauri-apps/api/core'

export interface UpdateInfo {
  version: string
  notes: string
  pubDate?: string | null
}

export interface CheckResult {
  available: boolean
  update?: UpdateInfo | null
}

export type ActivationPolicy = 'nextLaunch' | 'softReload'
export type ActivationStatus = 'pendingRestart' | 'appliedNow'

export interface ApplyResult {
  status: ActivationStatus
  version: string
  activationPolicy: ActivationPolicy
}

export interface CurrentVersion {
  nativeVersion: string
  otaVersion?: string | null
  effectiveVersion: string
  source: 'native' | 'ota'
}

export class Update {
  async apply(): Promise<ApplyResult> {
    return invoke<ApplyResult>('plugin:ota-self-update|apply_update')
  }
}

export async function setChannel(channel: string | null): Promise<void> {
  await invoke('plugin:ota-self-update|set_channel', { channel })
}

export async function check(): Promise<Update | null> {
  const res = await invoke<CheckResult>('plugin:ota-self-update|check_for_updates')
  return res.available ? new Update() : null
}

export async function checkWithMeta(): Promise<CheckResult> {
  return invoke<CheckResult>('plugin:ota-self-update|check_for_updates')
}

export async function getCurrentVersion(): Promise<CurrentVersion> {
  return invoke<CurrentVersion>('plugin:ota-self-update|get_current_version')
}
