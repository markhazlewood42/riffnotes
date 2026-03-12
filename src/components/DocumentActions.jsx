import { Button, Spinner } from "@heroui/react";
import { Copy, LockIcon, Printer } from "lucide-react";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  extractTitleFromDoc,
  useLyricSheet,
} from "../context/LyricSheetContext";
import { supabase } from "../supabase";

function SaveIndicator() {
  const { saveStatus, isLocked } = useLyricSheet();
  if (isLocked)
    return (
      <span className="save-indicator">
        <LockIcon size={18} />
      </span>
    );
  if (saveStatus === "saving" || saveStatus === "unsaved") {
    return <Spinner size="sm" color="current" className="save-indicator" />;
  }
  return <span className="save-indicator">Saved</span>;
}

function updateDocTitle(doc, newTitle) {
  if (!doc?.content) return doc;
  return {
    ...doc,
    content: doc.content.map((node) => {
      if (node.type !== "songTitle") return node;
      return { ...node, content: [{ type: "text", text: newTitle }] };
    }),
  };
}

async function getNextCopyTitle(baseTitle, userId) {
  const { data: songs } = await supabase
    .from("songs")
    .select("title")
    .eq("user_id", userId);

  const existingTitles = new Set((songs || []).map((s) => s.title));

  const first = `${baseTitle} (copy)`;
  if (!existingTitles.has(first)) return first;

  let n = 2;
  while (existingTitles.has(`${baseTitle} (copy ${n})`)) n++;
  return `${baseTitle} (copy ${n})`;
}

function DocumentActions() {
  const { editorRef, state } = useLyricSheet();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    if (duplicating) return;
    setDuplicating(true);

    const doc = editorRef.current?.getJSON() || null;
    const baseTitle = extractTitleFromDoc(doc) || "Untitled";
    const title = await getNextCopyTitle(baseTitle, user.id);
    const newDoc = updateDocTitle(doc, title);

    const { data, error } = await supabase
      .from("songs")
      .insert({
        user_id: user.id,
        document: newDoc,
        annotations: state.annotations,
        title,
      })
      .select("id")
      .single();

    setDuplicating(false);

    if (!error && data) {
      navigate(`/songs/${data.id}`);
    }
  };

  return (
    <div className="document-actions">
      <RouterLink to="/" className="link no-underline document-actions-back">
        ← All songs
      </RouterLink>
      <SaveIndicator />
      <Button
        size="sm"
        variant="secondary"
        onPress={handleDuplicate}
        isPending={duplicating}
      >
        {({ isPending }) => (
          <>
            {isPending ? (
              <Spinner size="sm" color="current" />
            ) : (
              <Copy size={16} />
            )}
            Make a copy
          </>
        )}
      </Button>
      <Button size="sm" variant="primary" onPress={() => window.print()}>
        <Printer size={16} />
        Print
      </Button>
    </div>
  );
}

export default DocumentActions;
