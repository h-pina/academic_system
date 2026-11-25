"use client";

import { useEffect, useState } from "react";
import TimeTravelPanel from "@/components/shell/TimeTravelPanel";
import { useServerClock } from "@/context/ClockContext";
import { useApi } from "@/hooks/useApi";
import { calendarMarkers, travelTargets, type TravelTarget } from "@/lib/academic";
import type { Semester } from "@/types";

/**
 * The floating time-travel widget, for any signed-in user. It reads the active
 * semester's deadlines to mark them on the calendar and offer shortcuts.
 */
export default function TimeTravelBar() {
  const { today, simulated, canTravel, travel, reset } = useServerClock();
  const { request } = useApi();
  const [targets, setTargets] = useState<TravelTarget[]>([]);
  const [markers, setMarkers] = useState<ReturnType<typeof calendarMarkers>>({});

  useEffect(() => {
    if (!canTravel) return;
    request<Semester[]>("/semesters?status=active", { silent: true }).then((result) => {
      const calendar = result.ok ? result.data[0]?.calendar : undefined;
      setTargets(calendar ? travelTargets(calendar) : []);
      setMarkers(calendar ? calendarMarkers(calendar) : {});
    });
  }, [request, canTravel]);

  return (
    <TimeTravelPanel
      today={today}
      simulated={simulated}
      canControl={canTravel}
      targets={targets}
      markers={markers}
      onTravel={(body) => void travel(body)}
      onReset={() => void reset()}
    />
  );
}
