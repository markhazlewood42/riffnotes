import { Button, Spinner } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DocumentActions from "../components/DocumentActions";
import GlobalToolbar from "../components/GlobalToolbar";
import { LyricSheetProvider } from "../context/LyricSheetContext";
import LyricEditor from "../editor/LyricEditor";
import { PAGE_GAP, PAGE_HEIGHT } from "../editor/pageLayout";
import { supabase } from "../supabase";

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
        <DocumentActions />
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
    if (id === "new") {
      setSongData({ document: null, annotations: {}, is_locked: false });
      setLoading(false);
      return;
    }
    setLoading(true);
    setSongData(null);
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
      songId={id === "new" ? null : id}
      initialDocument={songData.document}
      initialAnnotations={songData.annotations}
      isLocked={songData.is_locked}
    >
      <SongEditorInner />
    </LyricSheetProvider>
  );
}

export default SongEditor;
