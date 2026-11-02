// top-operator/apps/mobile/src/services/collectionService.ts
import axios from 'axios';
import { API_BASE_URL } from '../config';
import type { CollectionTaskEntry } from '../../../shared/types';

export const collectionService = {
  async fetchMyDTH(): Promise<CollectionTaskEntry[]> {
    const res = await axios.get(`${API_BASE_URL}/api/mobile/collection/dth`);
    return res.data.data ?? [];
  },
};
