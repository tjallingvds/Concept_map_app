import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function BlockNoteEditor() {
  // Creates a new editor instance
  const editor = useCreateBlockNote();

  return (
    <div className="w-full h-full">
      <BlockNoteView 
        editor={editor} 
        theme="light"
      />
    </div>
  );
} 