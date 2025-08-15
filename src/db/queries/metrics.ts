import { db } from "..";
import { metrics, type NewMetrics } from "../schema";


export async function createMetric(newMetric: NewMetrics) {
  const [res] = await db
    .insert(metrics)
    .values(newMetric)
    .returning();
  return res;
}

export async function getMetrics() {
  const rows = await db
    .select()
    .from(metrics);
  return rows[0];
}

export async function saveMetrics(newMetric: NewMetrics) {
  const [res] = await db
    .update(metrics)
    .set({
      name: newMetric.name,
      apiHits: newMetric.apiHits,
    })
    .returning();
  return res;
}