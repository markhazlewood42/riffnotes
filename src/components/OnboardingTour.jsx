import { useCallback, useEffect, useState } from "react";
import { Joyride, EVENTS, STATUS } from "react-joyride";

const TOUR_DONE_KEY = "riffnotes_tour_done";

export function hasTourBeenDone() {
  return localStorage.getItem(TOUR_DONE_KEY) === "true";
}

const STEPS = [
  {
    target: ".tiptap",
    title: "Try annotating",
    content:
      "Select any word or line — a toolbar appears. Use it to add a chord above the line or a performance note to the right.",
    placement: "right",
  },
  {
    target: ".save-indicator",
    title: "Auto-save",
    content: "Changes save automatically. No need to hit Save.",
    placement: "bottom",
  },
  {
    target: ".document-actions-back",
    title: "Your songs",
    content: "Head back here when you're ready to create your own song.",
    placement: "bottom",
  },
];

function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!hasTourBeenDone()) {
      // Short delay so the editor finishes rendering before beacons attach
      const timer = setTimeout(() => setRun(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEvent = useCallback((data) => {
    const { type, status } = data;
    if (
      type === EVENTS.TOUR_END ||
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED
    ) {
      localStorage.setItem(TOUR_DONE_KEY, "true");
      setRun(false);
    }
  }, []);

  if (hasTourBeenDone()) return null;

  return (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      scrollToFirstStep={false}
      onEvent={handleEvent}
      locale={{ last: "Done" }}
      options={{
        primaryColor: "#8217e7",
        backgroundColor: "#ffffff",
        textColor: "#18181b",
        arrowColor: "#ffffff",
        overlayColor: "rgba(0, 0, 0, 0.4)",
        beaconSize: 32,
        zIndex: 10000,
      }}
    />
  );
}

export default OnboardingTour;
