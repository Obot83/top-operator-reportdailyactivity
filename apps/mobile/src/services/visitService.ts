// top-operator/apps/mobile/src/services/visitService.ts
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const visitService = {
  async submitVisit(formData: FormData): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/mobile/visit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
    });
  },
};
