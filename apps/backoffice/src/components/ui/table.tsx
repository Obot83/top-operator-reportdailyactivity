import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-xs ${className}`} {...props} />
    </div>
  );
}

export function TableHeader({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`border-b border-slate-200/80 bg-slate-50/80 text-slate-700 font-semibold ${className}`} {...props} />;
}

export function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-slate-100 ${className}`} {...props} />;
}

export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-colors hover:bg-slate-50/70 data-[state=selected]:bg-slate-100 ${className}`}
      {...props}
    />
  );
}

export function TableHead({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`h-9 px-3 text-left align-middle text-[11px] font-semibold tracking-wider text-slate-600 uppercase ${className}`}
      {...props}
    />
  );
}

export function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`p-3 align-middle text-slate-700 leading-normal ${className}`} {...props} />;
}
