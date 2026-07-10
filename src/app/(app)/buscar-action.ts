'use server';

import { verifySession } from '@/lib/dal';
import { buscarExpedientes } from '@/lib/busqueda';

export async function buscarAction(query: string) {
  await verifySession();
  return buscarExpedientes(query, 8);
}
