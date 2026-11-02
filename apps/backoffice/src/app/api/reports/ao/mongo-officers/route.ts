import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import fs from 'fs';
import path from 'path';

export type AoOfficer = {
  id: string;
  name: string;
  branch: string;
};

let cachedOfficers: AoOfficer[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedOfficers && now - lastCacheTime < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cachedOfficers });
    }

    try {
      const db = await getMongoDb();
      const [leadsUsers, groupsSales] = await Promise.all([
        db.collection('leads').aggregate([
          { $match: { create_user: { $exists: true, $ne: null } } },
          { $group: { _id: '$create_user', branch: { $first: '$client.branch_name' } } },
        ]).toArray(),
        db.collection('leads_group').aggregate([
          { $match: { 'sales.id': { $exists: true, $ne: null } } },
          {
            $group: {
              _id: '$sales.id',
              name: { $first: '$sales.name' },
              branch: { $first: '$sales.branch_name' },
            },
          },
        ]).toArray(),
      ]);

      const aoMap = new Map<string, { name: string; branch: string }>();
      for (const l of leadsUsers) {
        if (l._id) aoMap.set(String(l._id), { name: String(l._id), branch: (l.branch as string) || '' });
      }
      for (const g of groupsSales) {
        if (g._id) {
          const id = String(g._id);
          const prev = aoMap.get(id);
          aoMap.set(id, {
            name: ((g.name as string) || (prev ? prev.name : id)).trim(),
            branch: (g.branch as string) || (prev ? prev.branch : ''),
          });
        }
      }

      cachedOfficers = Array.from(aoMap.entries())
        .map(([id, info]) => ({ id, name: info.name, branch: info.branch }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
      lastCacheTime = now;

      return NextResponse.json({ success: true, data: cachedOfficers });
    } catch (dbErr) {
      console.warn('[mongo-officers] DB query failed, falling back to local files:', dbErr);
      const MONGODB_DIR = path.resolve('d:/Project/top-operator/mongodb');
      if (fs.existsSync(path.join(MONGODB_DIR, 'kospinus001.leads.json'))) {
        const leads: any[] = JSON.parse(
          fs.readFileSync(path.join(MONGODB_DIR, 'kospinus001.leads.json'), 'utf8'),
        );
        const groups: any[] = JSON.parse(
          fs.readFileSync(path.join(MONGODB_DIR, 'kospinus001.leads_group.json'), 'utf8'),
        );

        const aoMap = new Map<string, { name: string; branch: string }>();
        for (const l of leads) {
          const id: string = l.create_user;
          if (!id) continue;
          if (!aoMap.has(id)) {
            aoMap.set(id, { name: id, branch: l.client?.branch_name ?? '' });
          }
        }
        for (const g of groups) {
          const id: string = g.sales?.id;
          const name: string = (g.sales?.name ?? '').trim();
          const branch: string = g.sales?.branch_name ?? '';
          if (!id) continue;
          if (!aoMap.has(id)) {
            aoMap.set(id, { name: name || id, branch });
          } else if (name) {
            const prev = aoMap.get(id)!;
            aoMap.set(id, { ...prev, name });
          }
        }

        cachedOfficers = Array.from(aoMap.entries())
          .map(([id, info]) => ({ id, name: info.name, branch: info.branch }))
          .sort((a, b) => a.name.localeCompare(b.name, 'id'));
        return NextResponse.json({ success: true, data: cachedOfficers });
      }
      throw dbErr;
    }
  } catch (error) {
    console.error('[mongo-officers]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat daftar AO' },
      { status: 500 },
    );
  }
}
