import { Button } from "@heroui/react";
import { Printer } from "lucide-react";
import { Link } from "react-router-dom";
import GlobalToolbar from "../components/GlobalToolbar";
import { LyricSheetProvider } from "../context/LyricSheetContext";
import LyricEditor from "../editor/LyricEditor";

const TEST_DOCUMENT = {
  type: "doc",
  content: [
    { type: "songTitle", content: [{ type: "text", text: "Test Song Title" }] },
    ...Array.from({ length: 60 }, (_, i) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `This is lyric line ${i + 1} — testing page break layout`,
        },
      ],
    })),
  ],
};

function TestEditor() {
  return (
    <LyricSheetProvider
      songId="test-song"
      initialDocument={TEST_DOCUMENT}
      initialAnnotations={{}}
    >
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
          <div className="document-body">
            <LyricEditor />
          </div>
        </div>
      </div>
    </LyricSheetProvider>
  );
}

export default TestEditor;
