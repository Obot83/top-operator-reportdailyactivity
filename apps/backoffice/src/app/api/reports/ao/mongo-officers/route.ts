import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MONGODB_DIR = path.resolve('d:/Project/top-operator/mongodb');

export type AoOfficer = {
  id: string;
  name: string;
  branch: string;
};

let cachedOfficers: AoOfficer[] | null = null;

export async function GET() {
  try {
    if (!cachedOfficers) {
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

      cachedOfficers = [...aoMap.entries()]
        .map(([id, info]) => ({ id, name: info.name, branch: info.branch }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }

    return NextResponse.json({ success: true, data: cachedOfficers });
  } catch (error) {
    console.error('[mongo-officers]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat daftar AO' },
      { status: 500 },
    );
  }
}
