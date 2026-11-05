import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  CheckCircle2,
  Filter,
  History,
  LogOut,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  ChartTooltipBox,
  DemoNote,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  Pill,
  RiskBadge,
  StatusBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppState } from "@/store/store";
import { isActiveStatus } from "@/data/seed";
import { DEPARTMENTS } from "@/data/conditions";
import { fmtDate, fmtDateTime, fmtRelative, fmtShortDate, pct } from "@/lib/format";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Risk } from "@/data/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hospital Overview & Executive Command – CareVista" },
      { name: "description", content: "Hospital command-centre overview with dynamic KPIs, admission trends, physician rosters, and telemetry surveillance." },
      { property: "og:title", content: "Hospital Overview – CareVista" },
      { property: "og:description", content: "Hospital command-centre KPIs, admissions and appointments (synthetic demo data)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

const RISK_COLORS: Record<Risk, string> = {
  Critical: "var(--critical)",
  Warning: "var(--warning)",
  Stable: "var(--success)",
};

function Overview() {
  const s = useAppState();
  const navigate = useNavigate();

  const [timeFilter, setTimeFilter] = useState<"today" | "7d" | "30d" | "90d" | "all">("30d");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const spanDays = timeFilter === "today" ? 1 : timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : timeFilter === "90d" ? 90 : 365;
  const timeLimit = s.anchor - spanDays * 86400000;

  // Filtered patient cohort
  const cohort = useMemo(() => {
    return s.patients.filter((p) => {
      const matchDept = departmentFilter === "All" || p.department === departmentFilter;
      const inTime = timeFilter === "all" || p.admissionDate >= timeLimit;
      return matchDept && inTime;
    });
  }, [s.patients, departmentFilter, timeFilter, timeLimit]);

  // Dynamic KPIs
  const k = useMemo(() => {
    const totalPatients = cohort.length;
    const admitted = cohort.filter((p) => isActiveStatus(p.status)).length;
    const discharged = cohort.filter((p) => p.status === "Discharged").length;
    const critical = cohort.filter((p) => p.risk === "Critical").length;
    const availableDocs = s.doctors.filter((d) => d.availability === "Available").length;
    const occupiedBeds = s.beds.filter((b) => b.status === "Occupied").length;
    const upcomingAppts = s.appointments.filter((a) => a.start >= s.anchor && a.status !== "Cancelled");
    return {
      totalPatients,
      admitted,
      discharged,
      critical,
      availableDocs,
      occupiedBeds,
      upcomingAppts: upcomingAppts.length,
    };
  }, [cohort, s.doctors, s.beds, s.appointments, s.anchor]);

  // Admission trends chart data
  const admissionTrends = useMemo(() => {
    const points: { date: string; admissions: number; discharges: number }[] = [];
    const days = spanDays;
    const step = Math.max(1, Math.floor(days / 10));

    for (let i = days; i >= 0; i -= step) {
      const t = s.anchor - i * 86400000;
      const label = fmtShortDate(t);
      const admits = cohort.filter((p) => p.admissionDate <= t && p.admissionDate >= t - step * 86400000).length;
      const disch = cohort.filter((p) => p.dischargeDate && p.dischargeDate <= t && p.dischargeDate >= t - step * 86400000).length;
      points.push({ date: label, admissions: Math.max(1, admits), discharges: disch });
    }
    return points;
  }, [cohort, s.anchor, spanDays]);

  // Department distribution
  const deptData = useMemo(() => {
    return DEPARTMENTS.map((dept) => {
      const pts = cohort.filter((p) => p.department === dept);
      const crit = pts.filter((p) => p.risk === "Critical").length;
      return { department: dept, count: pts.length, critical: crit };
    });
  }, [cohort]);

  // Risk distribution
  const riskPieData = useMemo(() => {
    const c = cohort.filter((p) => p.risk === "Critical").length;
    const w = cohort.filter((p) => p.risk === "Warning").length;
    const st = cohort.filter((p) => p.risk === "Stable").length;
    return [
      { name: "Critical", value: c, color: RISK_COLORS.Critical },
      { name: "Warning", value: w, color: RISK_COLORS.Warning },
      { name: "Stable", value: st, color: RISK_COLORS.Stable },
    ].filter((x) => x.value > 0);
  }, [cohort]);

  // Doctor Workload Comparison
  const doctorWorkloadData = useMemo(() => {
    return s.doctors.slice(0, 6).map((d) => ({
      name: d.name.replace("Dr. ", ""),
      specialty: d.specialization,
      patients: s.patients.filter((p) => p.doctorId === d.id).length,
      appointments: s.appointments.filter((a) => a.doctorId === d.id && a.status !== "Cancelled").length,
    }));
  }, [s.doctors, s.patients, s.appointments]);

  const recent = useMemo(() => {
    return [...cohort].sort((a, b) => b.admissionDate - a.admissionDate).slice(0, 6);
  }, [cohort]);

  const criticalList = useMemo(() => {
    return cohort.filter((p) => p.risk === "Critical");
  }, [cohort]);

  const upcomingApptsList = useMemo(() => {
    return s.appointments.filter((a) => a.start >= s.anchor && a.status !== "Cancelled").slice(0, 5);
  }, [s.appointments, s.anchor]);

  const doc = (id: string) => s.doctors.find((d) => d.id === id);
  const pat = (id: string) => s.patients.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Command Overview"
        description="Real-time operational command center. Key indicators dynamically calculated from CareVista's synthetic healthcare dataset."
        crumbs={[{ label: "Overview" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/present">Presentation Mode</Link>
            </Button>
          </div>
        }
      />
      <DemoNote />

      {/* Filter Toolbar */}
      <div className="panel p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Filter className="size-3.5 text-primary" />
            Filter Department:
          </span>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48 text-xs">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Timespan:</span>
          <div className="flex rounded-lg border border-border/80 p-0.5 bg-surface/50">
            {(["today", "7d", "30d", "90d", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  timeFilter === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "today" ? "Today" : t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : t === "90d" ? "90 Days" : "All Time"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <KpiCard
          label="Total Patients"
          value={k.totalPatients}
          sub="Registered in cohort"
          icon={Users}
          onClick={() => navigate({ to: "/patients" })}
        />
        <KpiCard
          label="Admitted Inpatients"
          value={k.admitted}
          sub="Inpatient + observation"
          icon={Activity}
          tone="info"
          onClick={() => navigate({ to: "/patients", search: { department: departmentFilter !== "All" ? departmentFilter : undefined } })}
        />
        <KpiCard
          label="Discharged Cohort"
          value={k.discharged}
          sub="Historical encounters"
          icon={LogOut}
          tone="muted"
          onClick={() => navigate({ to: "/patients" })}
        />
        <KpiCard
          label="Critical Risk Status"
          value={k.critical}
          sub="Immediate attention"
          icon={AlertTriangle}
          tone="critical"
          onClick={() => navigate({ to: "/monitoring" })}
        />
        <KpiCard
          label="Available Physicians"
          value={`${k.availableDocs}/${s.doctors.length}`}
          sub="On active duty"
          icon={Stethoscope}
          tone="success"
          onClick={() => navigate({ to: "/doctors" })}
        />
        <KpiCard
          label="Consultations Booked"
          value={s.appointments.length}
          sub={`${k.upcomingAppts} upcoming`}
          icon={CalendarDays}
          tone="primary"
          onClick={() => navigate({ to: "/appointments" })}
        />
        <KpiCard
          label="Hospital Departments"
          value={DEPARTMENTS.length}
          sub="Across 5 Indian cities"
          icon={Building2}
          tone="info"
          onClick={() => navigate({ to: "/locations" })}
        />
        <KpiCard
          label="Facility Bed Occupancy"
          value={`${pct(k.occupiedBeds, s.beds.length)}%`}
          sub={`${k.occupiedBeds} of ${s.beds.length} beds`}
          icon={BedDouble}
          tone="warning"
          onClick={() => navigate({ to: "/beds" })}
        />
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient Admission Trajectory */}
        <Panel
          title="Patient Admission & Discharge Trajectory"
          description={`Trends across selected ${timeFilter} window`}
          expandable
        >
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={admissionTrends} margin={{ left: -16, right: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovAdmit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ovDisch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Area type="monotone" dataKey="admissions" name="Admissions" stroke="var(--primary)" fillOpacity={1} fill="url(#ovAdmit)" />
                <Area type="monotone" dataKey="discharges" name="Discharges" stroke="var(--chart-2)" fillOpacity={1} fill="url(#ovDisch)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Department Patient Census */}
        <Panel
          title="Department-wise Patient Distribution"
          description="Census distribution across medical specialties"
          expandable
        >
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ left: -16, right: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} />
                <Bar dataKey="count" name="Total Patients" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="critical" name="Critical Acuity" fill="var(--critical)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Doctor Workload Comparison */}
        <Panel
          title="Attending Physician Workload Comparison"
          description="Assigned patient volume and consultation counts"
          expandable
        >
          <div className="h-60 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doctorWorkloadData} margin={{ left: -16, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="patients" name="Assigned Patients" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="appointments" name="Consultations" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Patient Risk Acuity Composition */}
        <Panel
          title="Patient Risk Acuity Stratification"
          description="Distribution of hemodynamic severity scores"
          expandable
        >
          <div className="flex items-center justify-around h-60 pt-2">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                    {riskPieData.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 text-xs">
              {riskPieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-foreground w-24">{item.name}</span>
                  <span className="num font-bold">{item.value} pts</span>
                  <span className="text-muted-foreground">({Math.round((item.value / cohort.length) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Operational Sections: Recent Admissions, Alerts & Upcoming Appointments */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Admissions */}
        <Panel
          title="Recent Admissions"
          description="Inpatients registered in this cohort"
          className="lg:col-span-2"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/patients">View All Directory →</Link>
            </Button>
          }
        >
          <ul className="divide-y divide-border/60">
            {recent.map((p) => (
              <li key={p.id}>
                <Link to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition">
                  <PatientAvatar name={p.name} seed={p.seed} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.name} <span className="num text-xs text-muted-foreground">· {p.id}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.condition} · {doc(p.doctorId)?.name}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <StatusBadge status={p.status} />
                  </div>
                  <RiskBadge risk={p.risk} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Critical Alerts */}
        <Panel
          title="Critical Acuity Alerts"
          description="Requires physician rounds"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/monitoring">Telemetry →</Link>
            </Button>
          }
        >
          {criticalList.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground italic">No critical acuity patients at this time.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {criticalList.map((p) => (
                <li key={p.id}>
                  <Link to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition">
                    <span className="pulse-dot size-2 rounded-full bg-critical text-critical" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.department} · Bed {p.room}-{p.bed}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{fmtRelative(p.lastUpdated)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Upcoming Appointments and Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Upcoming Consultations"
          description="Booked specialist visits"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/appointments">All Appointments →</Link>
            </Button>
          }
        >
          <ul className="divide-y divide-border/60">
            {upcomingApptsList.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                <span className="num w-36 shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.start)}</span>
                <span className="font-medium text-xs text-foreground">{pat(a.patientId)?.name}</span>
                <span className="text-xs text-muted-foreground">with {doc(a.doctorId)?.name}</span>
                <span className="ml-auto text-[11px] font-medium text-primary">{a.type}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Recent Activity Feed"
          description="Administrative and clinical session log"
          bodyClassName="p-0"
          actions={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/activity">Full Audit Log →</Link>
            </Button>
          }
        >
          <ul className="divide-y divide-border/60">
            {s.activity.slice(0, 5).map((act) => (
              <li key={act.id} className="flex items-center justify-between px-4 py-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{act.type}</p>
                  <p className="text-muted-foreground truncate max-w-sm">{act.description}</p>
                </div>
                <span className="num text-[11px] text-muted-foreground shrink-0 ml-2">
                  {fmtRelative(act.time)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
