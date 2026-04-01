import { useCallback, useEffect, useState } from "react";
import { EVENTS, Joyride, STATUS } from "react-joyride";

export const TOUR_DONE_KEY = "riffnotes_tour_done";

export function hasTourBeenDone() {
  return localStorage.getItem(TOUR_DONE_KEY) === "true";
}

const STEPS = [
  {
    target: ".tiptap",
    title: "Try annotating",
    content:
      "Select any word or line to add a chord above or a note to the right.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: ".save-indicator",
    title: "Auto-save",
    content: "Changes save automatically. No need to hit Save.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: ".document-actions-back-label",
    title: "Your songs",
    content: "Head back here when you're ready to create your own song.",
    placement: "right",
    disableBeacon: true,
  },
];

function OnboardingTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!hasTourBeenDone()) {
      const timer = setTimeout(() => {
        window.scrollTo(0, 0);
        setRun(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Lock scroll position while the tour is active. Joyride v3 uses
  // position:absolute for its overlay, so any scroll offsets the spotlight.
  // CSS overflow:hidden doesn't block programmatic scrollTo calls, so we
  // intercept the scroll event and snap back to 0.
  useEffect(() => {
    if (!run) return;
    const lockScroll = () => window.scrollTo({ top: 0, behavior: "instant" });
    window.addEventListener("scroll", lockScroll);
    return () => window.removeEventListener("scroll", lockScroll);
  }, [run]);

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
      disableScrolling
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
