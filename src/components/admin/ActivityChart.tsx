import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

export type Granularity = "days" | "weeks" | "months" | "years";

interface DataPoint { date: string; count: number }
interface Props {
  data: DataPoint[] | null;
  loading: boolean;
  granularity?: Granularity;
}

function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function aggregate(data: DataPoint[], granularity: Granularity): DataPoint[] {
  if (granularity === "days") return data;
  const map = new Map<string, number>();
  for (const { date, count } of data) {
    const key =
      granularity === "weeks"  ? startOfWeek(date) :
      granularity === "months" ? date.slice(0, 7) :
                                 date.slice(0, 4);
    map.set(key, (map.get(key) ?? 0) + count);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function tickFormatter(date: string, granularity: Granularity): string {
  if (granularity === "years") return date; // "YYYY"
  if (granularity === "months") {
    const [y, m] = date.split("-");
    const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
    return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`;
  }
  // days / weeks → "DD/MM"
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
}

function tooltipLabel(date: string, granularity: Granularity): string {
  if (granularity === "years") return date;
  if (granularity === "months") return tickFormatter(date, "months");
  if (granularity === "weeks") {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `Sem. du ${tickFormatter(date, "days")} au ${tickFormatter(end.toISOString().slice(0,10), "days")}`;
  }
  return tickFormatter(date, "days");
}

export default function ActivityChart({ data, loading, granularity = "days" }: Props) {
  if (loading) return <div className="animate-pulse bg-muted rounded-xl h-[200px] w-full" />;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  const chartData = aggregate(data, granularity);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(d) => tickFormatter(d, granularity)}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          width={35}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          labelFormatter={(d) => tooltipLabel(d, granularity)}
          formatter={(value: number) => [value, "Générations"]}
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
