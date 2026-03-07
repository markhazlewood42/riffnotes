import { Button, Spinner } from "@heroui/react";
import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import GlobalToolbar from "../components/GlobalToolbar";
import {
  LyricSheetProvider,
  useLyricSheet,
} from "../context/LyricSheetContext";
import LyricEditor from "../editor/LyricEditor";
import { supabase } from "../supabase";

const PAGE_HEIGHT = 1056;
const PAGE_GAP = 10;

function SaveIndicator() {
  const { saveStatus } = useLyricSheet();
  if (saveStatus === "saving" || saveStatus === "unsaved") {
    return <Spinner size="sm" color="current" className="save-indicator" />;
  }
  return <span className="save-indicator">Saved</span>;
}

function SongEditorInner() {
  const bodyRef = useRef(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const snapToPages = () => {
      const tiptap = body.querySelector(".tiptap");
      if (!tiptap) return;
      // scrollHeight includes spacer heights. Subtract spacer total to get
      // pure content height, then calculate pages from that.
      const spacers = tiptap.querySelectorAll(".page-break-spacer");
      let spacerTotal = 0;
      spacers.forEach((s) => {
        spacerTotal += s.offsetHeight;
      });
      const contentHeight = tiptap.scrollHeight - spacerTotal;
      const pages = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT));
      const totalHeight = pages * PAGE_HEIGHT + (pages - 1) * PAGE_GAP;
      // Add back spacer heights since they're part of the rendered layout
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
          <SaveIndicator />
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

function SongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [songData, setSongData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("songs")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setSongData(data);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="loading-screen">
        <Spinner size="lg" color="accent" />
      </div>
    );
  }

  if (error || !songData) {
    return (
      <div className="loading-screen">
        <div className="text-center">
          <p className="mb-4">{error || "Song not found"}</p>
          <Button variant="outline" onPress={() => navigate("/")}>
            Back to songs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LyricSheetProvider
      key={id}
      songId={id}
      initialDocument={songData.document}
      initialAnnotations={songData.annotations}
    >
      <SongEditorInner />
    </LyricSheetProvider>
  );
}

export default SongEditor;
