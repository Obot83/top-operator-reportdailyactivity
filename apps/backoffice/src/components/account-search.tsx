'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function AccountSearch({ monitor = false }: { monitor?: boolean }) {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = useState('');

  return (
    <form
      className="flex flex-col sm:flex-row gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const value = accountNumber.trim();
        if (!value) return;
        const query = monitor ? '?mode=monitor' : '';
        router.push(`/dashboard/debitur/${encodeURIComponent(value)}${query}`);
      }}
    >
      <input
        value={accountNumber}
        onChange={(event) => setAccountNumber(event.target.value)}
        placeholder="Nomor rekening"
        className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
      <Button type="submit">Buka rekening</Button>
    </form>
  );
}
