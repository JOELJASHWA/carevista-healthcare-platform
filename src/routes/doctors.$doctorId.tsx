import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Search,
  Stethoscope,
  UserX,
  Users,
} from "lucide-react";
import {
  ApptBadge,
  AvailabilityBadge,
  ChartTooltipBox,
  DemoNote,
  DoctorPhoto,
  EmptyState,
  KpiCard,
  PageHeader,
  Panel,
  PatientAvatar,
  RiskBadge,
  StatTile,
  StatusBadge,
} from "@/components/cv/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUi } from "@/components/cv/dialogs";
import { updateDoctor, useAppState } from "@/store/store";
import { HOSPITALS } from "@/data/seed";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Risk } from "@/data/types";
import { toast } from "sonner";

export const Route = createFileRoute("/doctors/$doctorId")({
  head: ({ params }) => ({
    meta: [
      { title: `Doctor ${params.doctorId} – CareVista` },
      { name: "description", content: "Dedicated physician dashboard, patient cohort, clinical schedule and workload analytics." },
      { property: "og:title", content: `Doctor ${params.doctorId} – CareVista` },
      { property: "og:description", content: "Dedicated physician dashboard and assigned patients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorDashboard,
});

const RISK_COLORS: Record<Risk, string> = {
  Critical: "var(--critical)",
  Warning: "var(--warning)",
  Stable: "var(--success)",
};

function DoctorDashboard() {
  const { doctorId } = Route.useParams();
  const s = useAppState();
  const ui = useUi();
  const navigate = useNavigate();

  const idx = s.doctors.findIndex((d) => d.id === doctorId);
  const doc = s.doctors[idx];

  const [patientSearch, setPatientSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  if (!doc) {
    return (
      <div className="panel p-8">
        <EmptyState
          icon={UserX}
          title={`Doctor ${doctorId} not found`}
          description="The requested physician profile does not exist in the demonstration dataset."
          action={
            <Button asChild size="sm" className="mt-2">
              <Link to="/doctors">Back to Doctors Directory</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const prevDoc = s.doctors[(idx - 1 + s.doctors.length) % s.doctors.length];
  const nextDoc = s.doctors[(idx + 1) % s.doctors.length];
  const hospital = HOSPITALS.find((h) => h.id === doc.hospitalId);

  // Assigned Patients
  const assignedPatients = useMemo(
    () => s.patients.filter((p) => p.doctorId === doc.id),
    [s.patients, doc.id]
  );

  const activeInpatients = useMemo(
    () => assignedPatients.filter((p) => p.status === "Admitted" || p.status === "Under Observation"),
    [assignedPatients]
  );

  const criticalCount = useMemo(
    () => assignedPatients.filter((p) => p.risk === "Critical").length,
    [assignedPatients]
  );

  // Appointments for this doctor
  const appointments = useMemo(
    () => s.appointments.filter((a) => a.doctorId === doc.id).sort((a, b) => a.start - b.start),
    [s.appointments, doc.id]
  );

  const upcomingAppts = useMemo(
    () => appointments.filter((a) => a.start >= s.anchor - 86400000 && a.status !== "Cancelled"),
    [appointments, s.anchor]
  );

  // Filtered patients table
  const filteredPatients = useMemo(() => {
    return assignedPatients.filter((p) => {
      const q = patientSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.condition.toLowerCase().includes(q);
      const matchRisk = riskFilter === "All" || p.risk === riskFilter;
      const matchStatus = statusFilter === "All" || p.status === statusFilter;
      return matchSearch && matchRisk && matchStatus;
    });
  }, [assignedPatients, patientSearch, riskFilter, statusFilter]);

  // Risk distribution data for chart
  const riskChartData = useMemo(() => {
    const counts: Record<Risk, number> = { Critical: 0, Warning: 0, Stable: 0 };
    assignedPatients.forEach((p) => {
      counts[p.risk] = (counts[p.risk] || 0) + 1;
    });
    return [
      { name: "Critical", value: counts.Critical, color: RISK_COLORS.Critical },
      { name: "Warning", value: counts.Warning, color: RISK_COLORS.Warning },
      { name: "Stable", value: counts.Stable, color: RISK_COLORS.Stable },
    ].filter((x) => x.value > 0);
  }, [assignedPatients]);

  // Patient status distribution
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = { Admitted: 0, "Under Observation": 0, Outpatient: 0, Discharged: 0 };
    assignedPatients.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [assignedPatients]);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <PageHeader
        title={doc.name}
        description={`${doc.specialization} · ${doc.qualification}`}
        crumbs={[{ label: "Doctors", to: "/doctors" }, { label: doc.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              asChild
              aria-label={`Previous physician: ${prevDoc.name}`}
            >
              <Link to="/doctors/$doctorId" params={{ doctorId: prevDoc.id }}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              aria-label={`Next physician: ${nextDoc.name}`}
            >
              <Link to="/doctors/$doctorId" params={{ doctorId: nextDoc.id }}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
            <Button
              onClick={() =>
                ui.openAppointment({
                  prefill: { doctorId: doc.id },
                })
              }
            >
              <CalendarPlus className="size-4 mr-1.5" />
              Book Consultation
            </Button>
          </div>
        }
      />
      <DemoNote />

      {/* Doctor Header Profile Panel */}
      <div className="panel grid gap-6 p-6 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <DoctorPhoto src={doc.photo} name={doc.name} size="xl" />
          <div className="text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="num text-xs text-muted-foreground">{doc.id}</span>
              <AvailabilityBadge a={doc.availability} />
            </div>
            <h2 className="mt-1 text-xl font-bold text-foreground">{doc.name}</h2>
            <p className="text-sm font-medium text-primary flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
              <Stethoscope className="size-4 shrink-0" />
              {doc.specialization} · Department Lead
            </p>
            <p className="mt-1 text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
              <GraduationCap className="size-3.5 shrink-0" />
              {doc.qualification}
            </p>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">{doc.bio}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border/60 sm:border-t-0 sm:border-l sm:border-border/60 sm:pl-6 text-xs">
          <div>
            <span className="eyebrow !text-[10px]">Medical Centre</span>
            <p className="mt-0.5 font-medium text-foreground">{hospital?.name.replace("CareVista Demo Hospital – ", "")}</p>
            <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="size-3" />
              {doc.city}, India
            </p>
          </div>
          <div>
            <span className="eyebrow !text-[10px]">Experience</span>
            <p className="num mt-0.5 text-base font-semibold text-foreground">{doc.experience} Years</p>
            <p className="text-muted-foreground">Senior Consultant</p>
          </div>
          <div>
            <span className="eyebrow !text-[10px]">Demonstration Contact</span>
            <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
              <Mail className="size-3" />
              {doc.email}
            </p>
            <p className="flex items-center gap-1 text-muted-foreground mt-0.5">
              <Phone className="size-3" />
              {doc.phone}
            </p>
          </div>
          <div>
            <span className="eyebrow !text-[10px]">Consulting Hours</span>
            <p className="num mt-0.5 font-medium text-foreground">
              {doc.hours[0]}:00 – {doc.hours[1]}:00
            </p>
            <p className="text-[11px] text-muted-foreground">
              Days: {doc.workDays.map((w) => daysOfWeek[w]).join(", ")}
            </p>
          </div>
        </div>

        <div className="flex lg:flex-col justify-center gap-2 border-t border-border/60 lg:border-t-0 lg:border-l lg:border-border/60 lg:pl-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextStatus =
                doc.availability === "Available"
                  ? "In Surgery"
                  : doc.availability === "In Surgery"
                  ? "Off Duty"
                  : "Available";
              updateDoctor(doc.id, { availability: nextStatus });
              toast.success(`Physician status updated: ${nextStatus}`);
            }}
          >
            Toggle Duty Status
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Assigned Patients" value={assignedPatients.length} sub="Total patient cohort" icon={Users} />
        <KpiCard label="Active Inpatients" value={activeInpatients.length} sub="Admitted / Observation" icon={Users} tone="info" />
        <KpiCard
          label="Critical Risk"
          value={criticalCount}
          sub="Requires close monitoring"
          icon={Users}
          tone={criticalCount > 0 ? "critical" : "muted"}
        />
        <KpiCard label="Upcoming Consults" value={upcomingAppts.length} sub="Next 7 days" icon={CalendarDays} tone="primary" />
      </div>

      {/* Workload and Cohort Risk Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Patient Risk Profile" description="Acuity distribution across assigned cohort">
          {riskChartData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 pt-2">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {riskChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltipBox />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-xs">
                {riskChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="w-16 font-medium text-foreground">{item.name}</span>
                    <span className="num font-semibold">{item.value} patients</span>
                    <span className="text-muted-foreground">
                      ({Math.round((item.value / assignedPatients.length) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No patient risk data" />
          )}
        </Panel>

        <Panel title="Inpatient Care Status" description="Breakdown of inpatient vs outpatient status">
          <div className="h-48 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ left: -20, right: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
                <Tooltip content={<ChartTooltipBox />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                <Bar dataKey="count" name="Patients" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Assigned Patient Directory */}
      <Panel
        title="Assigned Patient Directory"
        description="Active cohort under this physician's clinical supervision"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search assigned patients by name, ID or condition..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Risks</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="Warning">Warning</SelectItem>
                <SelectItem value="Stable">Stable</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Care Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Admitted">Admitted</SelectItem>
                <SelectItem value="Under Observation">Under Observation</SelectItem>
                <SelectItem value="Outpatient">Outpatient</SelectItem>
                <SelectItem value="Discharged">Discharged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <EmptyState
            title="No assigned patients found"
            description="No patients match the current search or risk filters."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPatientSearch("");
                  setRiskFilter("All");
                  setStatusFilter("All");
                }}
              >
                Clear Filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/80 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Age / Gender</th>
                  <th className="px-4 py-3 font-medium">Condition</th>
                  <th className="px-4 py-3 font-medium">Room / Bed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Risk Level</th>
                  <th className="px-4 py-3 font-medium">Admission</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="transition hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PatientAvatar name={p.name} seed={p.seed} size="sm" />
                        <div>
                          <Link
                            to="/patients/$patientId"
                            params={{ patientId: p.id }}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {p.name}
                          </Link>
                          <p className="num text-[11px] text-muted-foreground">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="num px-4 py-3 text-muted-foreground">
                      {p.age} y · {p.gender}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{p.condition}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.room === "—" ? "Outpatient" : `Bed ${p.room}-${p.bed}`}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge risk={p.risk} />
                    </td>
                    <td className="num px-4 py-3 text-xs text-muted-foreground">
                      {fmtDate(p.admissionDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
                        <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                          View Vitals →
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Upcoming Consultation Schedule */}
      <Panel
        title="Upcoming Consultations & Clinical Roster"
        description="Booked appointments and diagnostic reviews"
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => ui.openAppointment({ prefill: { doctorId: doc.id } })}
          >
            <CalendarPlus className="size-3.5 mr-1" />
            Add Appointment
          </Button>
        }
      >
        {upcomingAppts.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming consultations scheduled"
            description="Schedule a new appointment using the button above."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingAppts.slice(0, 6).map((a) => {
              const pat = s.patients.find((p) => p.id === a.patientId);
              return (
                <div
                  key={a.id}
                  className="rounded-lg border border-border/70 bg-surface/60 p-3.5 text-xs transition hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="num font-semibold text-foreground">{fmtDateTime(a.start)}</span>
                    <ApptBadge s={a.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {pat && <PatientAvatar name={pat.name} seed={pat.seed} size="sm" />}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {pat ? (
                          <Link to="/patients/$patientId" params={{ patientId: pat.id }} className="hover:underline">
                            {pat.name}
                          </Link>
                        ) : (
                          a.patientId
                        )}
                      </p>
                      <p className="text-muted-foreground">{a.type} · {a.duration} mins</p>
                    </div>
                  </div>
                  {a.notes && <p className="mt-2 text-muted-foreground line-clamp-1 italic">"{a.notes}"</p>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
