/**
 * Servicio de caché para el Dashboard CEN
 * - Producción (Vercel): usa Vercel KV (Redis)
 * - Desarrollo / fallback: variables en memoria con TTL
 */

import type { DashboardData } from './types';

const CACHE_TTL_SECONDS = 32 * 24 * 60 * 60; // 32 días
const CACHE_KEY = 'cen_dashboard_data_v1';

interface MemoryCache { data: DashboardData | null; expiresAt: number }
const memoryCache: MemoryCache = { data: null, expiresAt: 0 };

async function kvGet(key: string): Promise<DashboardData | null> {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
    const resp = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.result ? JSON.parse(json.result) : null;
  } catch { return null; }
}

async function kvSet(key: string, value: DashboardData, ttl: number): Promise<void> {
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return;
    await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: JSON.stringify(value), ex: ttl }),
    });
  } catch { /* silencioso */ }
}

export async function getCachedData(): Promise<DashboardData | null> {
  if (memoryCache.data && Date.now() < memoryCache.expiresAt) return memoryCache.data;
  const kvData = await kvGet(CACHE_KEY);
  if (kvData) {
    memoryCache.data = kvData;
    memoryCache.expiresAt = Date.now() + CACHE_TTL_SECONDS * 1000;
    return kvData;
  }
  return null;
}

export async function setCachedData(data: DashboardData): Promise<void> {
  memoryCache.data = data;
  memoryCache.expiresAt = Date.now() + CACHE_TTL_SECONDS * 1000;
  await kvSet(CACHE_KEY, data, CACHE_TTL_SECONDS);
}

export async function invalidateCache(): Promise<void> {
  memoryCache.data = null;
  memoryCache.expiresAt = 0;
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await fetch(`${process.env.KV_REST_API_URL}/del/${CACHE_KEY}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
      });
    }
  } catch { /* silencioso */ }
}

export function isCacheValid(data: DashboardData): boolean {
  if (!data.ultimaActualizacion) return false;
  const diffDias = (Date.now() - new Date(data.ultimaActualizacion).getTime()) / (1000 * 60 * 60 * 24);
  return diffDias < 32;
}
