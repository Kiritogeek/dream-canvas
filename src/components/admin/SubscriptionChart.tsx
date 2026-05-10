import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { Granularity } from "./ActivityChart";

interface SubMonth {
  month: string; // "YYYY-MM"
  createur: number;
  studio: number;
  total: number;
}

interface Props {
  data: SubMonth[] | null;
  loading: boolean;
  granularity?: Granularity;
}

function aggregateByYear(data: SubMonth[]) {
  const map = new Map<string, { createur: number; studio: number }>();
  for (const { month, createur, studio } of data) {
    const year = month.slice(0, 4);
    const cur = map.get(year) ?? { createur: 0, studio: 0 };
    map.set(year, { createur: cur.createur + createur, studio: cur.studio + studio });
  }
  return Array.from(map.entries())
    .map(([year, counts]) => ({ year, ...counts, total: counts.createur + counts.studio }))
    .sort((a, b) => a.year.localeCompare(b.year));
}

function formatMonthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return `${MONTHS[parseInt(mo) - 1]} ${y.slice(2)}`;
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
  itemStyle: { color: "hsl(var(--foreground))" },
  cursor: { fill: "hsl(var(--muted))", opacity: 0.3 },
};

export default function SubscriptionChart({ data, loading, granularity = "months" }: Props) {
  if (loading) return <div className="animate-pulse bg-muted rounded-xl h-[200px] w-full" />;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
        Aucun abonnement payant enregistré
      </div>
    );
  }

  if (granularity === "years") {
    const yearData = aggregateByYear(data);
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={yearData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis width={35} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }} formatter={(v) => v === "createur" ? "Créateur" : "Studio"} />
          <Bar dataKey="createur" stackId="a" fill="hsl(var(--primary))" name="createur" />
          <Bar dataKey="studio" stackId="a" fill="hsl(271 91% 65%)" radius={[4, 4, 0, 0]} name="studio" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthLabel}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis width={35} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip labelFormatter={formatMonthLabel} {...TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }} formatter={(v) => v === "createur" ? "Créateur" : "Studio"} />
        <Bar dataKey="createur" stackId="a" fill="hsl(var(--primary))" name="createur" />
        <Bar dataKey="studio" stackId="a" fill="hsl(271 91% 65%)" radius={[4, 4, 0, 0]} name="studio" />
      </BarChart>
    </ResponsiveContainer>
  );
}
