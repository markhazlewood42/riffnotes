import { Button } from "@heroui/react";
import { Printer } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import GlobalToolbar from "../components/GlobalToolbar";
import { LyricSheetProvider, useLyricSheet } from "../context/LyricSheetContext";
import LyricEditor from "../editor/LyricEditor";
import { useAnnotationLayout } from "../hooks/useAnnotationLayout";
import { PAGE_GAP, PAGE_HEIGHT } from "../editor/pageLayout";

// Real image URLs from Supabase Storage (user's actual annotation images)
const IMG_1 = "https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/bd91ce62-c32e-4d12-a484-b14584086226.png";
const IMG_2 = "https://aukdulztojapsiocohna.supabase.co/storage/v1/object/public/annotation-images/ca950489-b695-4311-b9f0-ffed088ed551.png";

// Stress test document — based on "Green Day - 21 Guns" with real lineIds
const TEST_DOCUMENT = {
  type: "doc",
  content: [
    {
      type: "songTitle",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Stress Test — 21 Guns" }],
    },
    // Verse 1
    { type: "paragraph", attrs: { lineId: "st-v1-1" }, content: [{ type: "text", text: "Do you know what's worth fighting for" }] },
    { type: "paragraph", attrs: { lineId: "st-v1-2" }, content: [{ type: "text", text: "When it's not worth dying for?  //  Does it take your breath away" }] },
    { type: "paragraph", attrs: { lineId: "st-v1-3" }, content: [{ type: "text", text: "And you feel yourself suffocating" }] },
    { type: "paragraph", attrs: { lineId: "st-v1-4" }, content: [{ type: "text", text: "Does the pain weigh out the pride?" }] },
    { type: "paragraph", attrs: { lineId: "st-v1-5" }, content: [{ type: "text", text: "And you look for a place to hide" }] },
    { type: "paragraph", attrs: { lineId: "st-v1-6" }, content: [{ type: "text", text: "Did someone break your heart inside  //  You're in ruins" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-1" } },
    // Chorus
    { type: "paragraph", attrs: { lineId: "st-ch-label" }, content: [{ type: "text", marks: [{ type: "bold" }], text: "[Chorus]" }] },
    { type: "paragraph", attrs: { lineId: "st-ch-1" }, content: [{ type: "text", text: "One, 21 Guns  //  Lay down your arms" }] },
    { type: "paragraph", attrs: { lineId: "st-ch-2" }, content: [{ type: "text", text: "Give up the fight  //  One, 21 Guns" }] },
    { type: "paragraph", attrs: { lineId: "st-ch-3" }, content: [{ type: "text", text: "Throw up your arms into the sky  //  You and I" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-2" } },
    // Verse 2
    { type: "paragraph", attrs: { lineId: "st-v2-1" }, content: [{ type: "text", text: "When you're at the end of the road" }] },
    { type: "paragraph", attrs: { lineId: "st-v2-2" }, content: [{ type: "text", text: "And you lost all sense of control" }] },
    { type: "paragraph", attrs: { lineId: "st-v2-3" }, content: [{ type: "text", text: "And your thoughts have taken their toll" }] },
    { type: "paragraph", attrs: { lineId: "st-v2-4" }, content: [{ type: "text", text: "When your mind breaks the spirit of your soul" }] },
    { type: "paragraph", attrs: { lineId: "st-v2-5" }, content: [{ type: "text", text: "Your faith walks on broken glass" }] },
    { type: "paragraph", attrs: { lineId: "st-v2-6" }, content: [{ type: "text", text: "And the hangover doesn't pass" }] },
    { type: "paragraph", attrs: { lineId: "st-v2-7" }, content: [{ type: "text", text: "Nothing's ever built to last //  You're in ruins" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-3" } },
    // Chorus repeat
    { type: "paragraph", attrs: { lineId: "st-ch2-label" }, content: [{ type: "text", marks: [{ type: "bold" }], text: "[[ Chorus ]]" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-4" } },
    // Verse 3
    { type: "paragraph", attrs: { lineId: "st-v3-1" }, content: [{ type: "text", text: "Did you try to live on your own" }] },
    { type: "paragraph", attrs: { lineId: "st-v3-2" }, content: [{ type: "text", text: "When you burned down the house and home?" }] },
    { type: "paragraph", attrs: { lineId: "st-v3-3" }, content: [{ type: "text", text: "Did you stand too close to the fire" }] },
    { type: "paragraph", attrs: { lineId: "st-v3-4" }, content: [{ type: "text", text: "Like a liar looking for forgiveness from a stone?" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-5" } },
    // Guitar solo
    { type: "paragraph", attrs: { lineId: "st-solo" }, content: [{ type: "text", marks: [{ type: "bold" }], text: "[[ Guitar solo ]]" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-6" } },
    // Final section
    { type: "paragraph", attrs: { lineId: "st-fin-1" }, content: [{ type: "text", text: "When it's time to live and let die  //  And you can't get another try" }] },
    { type: "paragraph", attrs: { lineId: "st-fin-2" }, content: [{ type: "text", text: "Something inside this heart has died  //  You're in ruins" }] },
    { type: "paragraph", attrs: { lineId: "st-blank-7" } },
    // Outro
    { type: "paragraph", attrs: { lineId: "st-outro" }, content: [{ type: "text", marks: [{ type: "bold" }], text: "[[ Chorus x2 ]]" }] },
  ],
};

// Dense stress test annotations — tests cascading stacks, mixed types, all styles
const TEST_ANNOTATIONS = {
  // === VERSE 1: 4 consecutive annotations (cascading stack stress test) ===
  "st-ann-1": {
    id: "st-ann-1", type: "right-side", lineId: "st-v1-1", charOffset: 12,
    value: "Dm → Bb → F → C progression throughout verse",
    style: "default",
  },
  "st-ann-2": {
    id: "st-ann-2", type: "image", lineId: "st-v1-2", charOffset: 0,
    url: IMG_1,
  },
  "st-ann-3": {
    id: "st-ann-3", type: "right-side", lineId: "st-v1-3", charOffset: 8,
    value: "Softer dynamics — build gradually through this line",
    style: "default",
  },
  "st-ann-4": {
    id: "st-ann-4", type: "image", lineId: "st-v1-4", charOffset: 10,
    url: IMG_2,
  },
  // Gap — v1-5 has no annotation
  "st-ann-5": {
    id: "st-ann-5", type: "right-side", lineId: "st-v1-6", charOffset: 35,
    value: "Big crescendo into chorus. Hold 'ruins' for full measure. Band cuts out except guitar arpeggio — let it ring before the drop.",
    style: "default",
  },

  // === CHORUS: 4 consecutive annotations (mixed image + text) ===
  "st-ann-6": {
    id: "st-ann-6", type: "right-side", lineId: "st-ch-label", charOffset: 0,
    value: "BREAK", style: "rest",
  },
  "st-ann-7": {
    id: "st-ann-7", type: "image", lineId: "st-ch-1", charOffset: 0,
    url: IMG_2,
  },
  "st-ann-8": {
    id: "st-ann-8", type: "right-side", lineId: "st-ch-2", charOffset: 0,
    value: "Full band drops in — crash cymbal on the 1",
    style: "default",
  },
  "st-ann-9": {
    id: "st-ann-9", type: "right-side", lineId: "st-ch-3", charOffset: 20,
    value: "Arms up gesture to audience. Really milk this moment — the crowd should be singing along by the second chorus.",
    style: "default",
  },

  // === VERSE 2: dense annotations on 6 out of 7 lines ===
  "st-ann-10": {
    id: "st-ann-10", type: "image", lineId: "st-v2-1", charOffset: 0,
    url: IMG_1,
  },
  "st-ann-11": {
    id: "st-ann-11", type: "right-side", lineId: "st-v2-2", charOffset: 4,
    value: "Here is a text note",
    style: "default",
  },
  "st-ann-12": {
    id: "st-ann-12", type: "right-side", lineId: "st-v2-3", charOffset: 15,
    value: "Watch tempo — drummer tends to rush here",
    style: "default",
  },
  "st-ann-13": {
    id: "st-ann-13", type: "image", lineId: "st-v2-4", charOffset: 5,
    url: IMG_2,
  },
  "st-ann-14": {
    id: "st-ann-14", type: "right-side", lineId: "st-v2-5", charOffset: 11,
    value: "KEY CHANGE", style: "special",
  },
  "st-ann-15": {
    id: "st-ann-15", type: "right-side", lineId: "st-v2-6", charOffset: 0,
    value: "Back to original key",
    style: "default",
  },
  // v2-7 no annotation — tests gap after dense run

  // === CHORUS 2 LABEL ===
  "st-ann-16": {
    id: "st-ann-16", type: "right-side", lineId: "st-ch2-label", charOffset: 0,
    value: "Same as first chorus but louder",
    style: "default",
  },

  // === VERSE 3: 4 consecutive with one very long annotation ===
  "st-ann-17": {
    id: "st-ann-17", type: "right-side", lineId: "st-v3-1", charOffset: 8,
    value: "Stripped down — just vocals and acoustic guitar",
    style: "default",
  },
  "st-ann-18": {
    id: "st-ann-18", type: "image", lineId: "st-v3-2", charOffset: 5,
    url: IMG_1,
  },
  "st-ann-19": {
    id: "st-ann-19", type: "right-side", lineId: "st-v3-3", charOffset: 22,
    value: "Fire = metaphor callback to v1",
    style: "default",
  },
  "st-ann-20": {
    id: "st-ann-20", type: "right-side", lineId: "st-v3-4", charOffset: 7,
    value: "Longest line — needs clear enunciation on 'forgiveness from a stone'. Really push through this phrase with conviction and clarity. The audience should feel every word.",
    style: "default",
  },

  // === GUITAR SOLO + FINAL SECTION ===
  "st-ann-21": {
    id: "st-ann-21", type: "right-side", lineId: "st-solo", charOffset: 0,
    value: "SOLO — 16 BARS", style: "rest",
  },
  "st-ann-22": {
    id: "st-ann-22", type: "image", lineId: "st-fin-1", charOffset: 0,
    url: IMG_2,
  },
  "st-ann-23": {
    id: "st-ann-23", type: "right-side", lineId: "st-fin-2", charOffset: 30,
    value: "Final 'ruins' — let it ring, no cutoff",
    style: "default",
  },
  "st-ann-24": {
    id: "st-ann-24", type: "right-side", lineId: "st-outro", charOffset: 0,
    value: "DOUBLE CHORUS — BIG FINISH", style: "special",
  },

  // === CHORDS scattered across the song ===
  "st-chord-1": {
    id: "st-chord-1", type: "chord", lineId: "st-v1-1", charOffset: 0, charOffsetEnd: 6,
    value: "Dm",
  },
  "st-chord-2": {
    id: "st-chord-2", type: "chord", lineId: "st-v1-1", charOffset: 20, charOffsetEnd: 28,
    value: "Bb",
  },
  "st-chord-3": {
    id: "st-chord-3", type: "chord", lineId: "st-v1-3", charOffset: 0, charOffsetEnd: 3,
    value: "F",
  },
  "st-chord-4": {
    id: "st-chord-4", type: "chord", lineId: "st-v1-3", charOffset: 20, charOffsetEnd: 25,
    value: "C",
  },
  "st-chord-5": {
    id: "st-chord-5", type: "chord", lineId: "st-ch-1", charOffset: 0, charOffsetEnd: 3,
    value: "F",
  },
  "st-chord-6": {
    id: "st-chord-6", type: "chord", lineId: "st-ch-1", charOffset: 16, charOffsetEnd: 19,
    value: "C",
  },
  "st-chord-7": {
    id: "st-chord-7", type: "chord", lineId: "st-v2-5", charOffset: 0, charOffsetEnd: 4,
    value: "C#",
  },
  "st-chord-8": {
    id: "st-chord-8", type: "chord", lineId: "st-v2-5", charOffset: 16, charOffsetEnd: 22,
    value: "Ebm",
  },
};

function TestEditorInner() {
  const bodyRef = useRef(null);
  const { state, editingNote, setLayoutMap } = useLyricSheet();
  useAnnotationLayout(bodyRef, state.annotations, editingNote, setLayoutMap);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const snapToPages = () => {
      const tiptap = body.querySelector(".tiptap");
      if (!tiptap) return;
      const spacers = tiptap.querySelectorAll(".page-break-spacer");
      let spacerTotal = 0;
      spacers.forEach((s) => { spacerTotal += s.offsetHeight; });
      const contentHeight = tiptap.scrollHeight - spacerTotal;
      const pages = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT));
      const totalHeight = pages * PAGE_HEIGHT + (pages - 1) * PAGE_GAP;
      body.style.minHeight = `${totalHeight + spacerTotal}px`;
    };

    const observer = new ResizeObserver(snapToPages);
    const tiptap = body.querySelector(".tiptap");
    if (tiptap) observer.observe(tiptap);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <GlobalToolbar />
      <div className="app-container">
        <div className="document-actions">
          <Link to="/" className="link document-actions-back">
            ← All songs
          </Link>
          <Button
            size="sm"
            color="accent"
            onPress={() => window.print()}
            startContent={<Printer size={16} />}
          >
            Print
          </Button>
        </div>
        <div className="document-container">
          <div className="document-body" ref={bodyRef}>
            <LyricEditor />
          </div>
        </div>
      </div>
    </>
  );
}

function TestEditor() {
  return (
    <LyricSheetProvider
      songId="test-song"
      initialDocument={TEST_DOCUMENT}
      initialAnnotations={TEST_ANNOTATIONS}
    >
      <TestEditorInner />
    </LyricSheetProvider>
  );
}

export default TestEditor;
