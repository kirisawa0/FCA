import type { ReactNode } from 'react';



interface Props {

  label: string;

  value: ReactNode;

  accent?: string;

  hint?: string;

}



export function StatCard({ label, value, accent = 'text-gold', hint }: Props) {

  return (

    <div className="card card-top-accent group flex h-full flex-col p-4 transition duration-200 hover:border-brand-400/30 hover:shadow-gold-sm">

      <p className="min-h-[2.5rem] text-xs font-medium uppercase leading-snug tracking-wide text-zinc-500 line-clamp-2">

        {label}

      </p>

      <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>

      <p className="mt-1 min-h-[1rem] text-xs text-zinc-600">{hint ?? '\u00a0'}</p>

    </div>

  );

}

