import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing across CareVista platform", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  const routes = [
    { path: "/", name: "Hospital Overview" },
    { path: "/doctors", name: "Doctors Directory" },
    { path: "/doctors/DR-001", name: "Doctor Dashboard" },
    { path: "/patients", name: "Patients Directory" },
    { path: "/patients/CV-P1001", name: "Patient Profile & Vitals" },
    { path: "/appointments", name: "Appointment Management" },
    { path: "/monitoring", name: "Clinical Monitoring Command" },
    { path: "/beds", name: "Bed Management" },
    { path: "/analytics", name: "Enterprise Analytics" },
    { path: "/alerts", name: "Alerts & Notifications" },
    { path: "/reports", name: "Custom Report Builder" },
    { path: "/settings", name: "Settings" },
    { path: "/compare", name: "Patient Comparison" },
    { path: "/anomalies", name: "Anomaly Detection" },
    { path: "/simulation", name: "What-If Simulation" },
    { path: "/locations", name: "Hospital Locations" },
    { path: "/activity", name: "Activity Log" },
    { path: "/present", name: "Presentation Mode" },
  ];

  for (const { path, name } of routes) {
    it(`matches valid route for ${name} (${path})`, () => {
      const matches = router.matchRoutes(path);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    });
  }
});
