import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AdminGlobalKPIs } from "@/services/adminService";

interface Props {
  data: AdminGlobalKPIs["planDistribution"] | null;
  loading: boolean;
}

const PLAN_COLORS: Record<string, string> = {
  libre:    "hsl(var(--muted-foreground))",
  createur: "hsl(var(--primary))",
  studio:   "hsl(271 91% 65%)", /* violet Studio — pas de token design system pour cette couleur */
};

const PLAN_LABELS: Record<string, string> = {
  libre:    "Libre",
  createur: "Créateur",
  studio:   "Studio",
};

export default function PlanDistributionChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse bg-muted rounded-full h-[200px] w-[200px]" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-4 w-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={PLAN_COLORS[entry.name] ?? "hsl(var(--muted))"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [value, PLAN_LABELS[name] ?? name]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            itemStyle={{ color: "hsl(var(--foreground))" }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex gap-4 flex-wrap justify-center">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0"
              style={{ background: PLAN_COLORS[entry.name] }}
            />
            <span className="text-xs text-muted-foreground">
              {PLAN_LABELS[entry.name]} ({entry.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
