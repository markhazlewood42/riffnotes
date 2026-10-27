import { useEffect } from "react";
import { useJoyride, EVENTS, STATUS } from "react-joyride";

export const TOUR_DONE_KEY = "riffnotes_tour_done";

export function hasTourBeenDone() {
  return localStorage.getItem(TOUR_DONE_KEY) === "true";
}

const STEPS = [
  {
    target: "[data-line-id='line-seed-8'] .lyric-content-wrapper",
    title: "Try annotating",
    content:
      "Select any word or line to add a chord above or a note to the right.",
    placement: "bottom",
  },
  {
    target: ".save-indicator",
    title: "Auto-save",
    content: "Changes save automatically. No need to hit Save.",
    placement: "bottom",
  },
  {
    target: ".document-actions-back-label",
    title: "Your songs",
    content: "Head back here when you're ready to create your own song.",
    placement: "right",
  },
];

function OnboardingTour() {
  const { controls, on, Tour } = useJoyride({
    steps: STEPS,
    run: false,
    continuous: true,
    disableScrolling: true,
    scrollToFirstStep: false,
    locale: { last: "Done" },
    options: {
      primaryColor: "#8217e7",
      backgroundColor: "#ffffff",
      textColor: "#18181b",
      arrowColor: "#ffffff",
      overlayColor: "rgba(0, 0, 0, 0.4)",
      beaconSize: 32,
      zIndex: 10000,
    },
  });

  // Start the tour shortly after mount, giving TipTap time to render
  useEffect(() => {
    if (hasTourBeenDone()) return;
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      controls.start(0);
    }, 600);
    return () => clearTimeout(timer);
  }, [controls]);

  // Skip the beacon — immediately open the tooltip for every step
  useEffect(() => {
    return on(EVENTS.BEACON, (_data, c) => c.open());
  }, [on]);

  // Mark tour done on finish or skip
  useEffect(() => {
    return on(EVENTS.TOUR_END, ({ status }) => {
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        localStorage.setItem(TOUR_DONE_KEY, "true");
      }
    });
  }, [on]);

  // Lock scroll while tour overlay is active (Joyride v3 uses position:absolute)
  useEffect(() => {
    const lockScroll = () => window.scrollTo({ top: 0, behavior: "instant" });
    const unsubStart = on(EVENTS.TOUR_START, () =>
      window.addEventListener("scroll", lockScroll),
    );
    const unsubEnd = on(EVENTS.TOUR_END, () =>
      window.removeEventListener("scroll", lockScroll),
    );
    return () => {
      unsubStart();
      unsubEnd();
      window.removeEventListener("scroll", lockScroll);
    };
  }, [on]);

  return Tour;
}

export default OnboardingTour;
