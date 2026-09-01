'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import styles from '../css/RichTextEditor.module.css';

function ToolbarIcon({ name }) {
  const paths = {
    bold: <path d="M7 5h5a3 3 0 0 1 0 6H7zm0 6h6a3 3 0 0 1 0 6H7zM7 5v12" />,
    italic: <path d="M10 5h7M7 19h7M13 5 9 19" />,
    underline: <><path d="M6 5v5a6 6 0 0 0 12 0V5" /><path d="M5 20h14" /></>,
    bullets: <><path d="M9 6h10M9 12h10M9 18h10" /><path d="M5 6h.01M5 12h.01M5 18h.01" /></>,
    ordered: <><path d="M10 6h9M10 12h9M10 18h9" /><path d="M4 5h2v3M4 8h2M6 11H4l2 2-2 2h2M4 19c0-2 3-2 3 0 0 1-3 1-3 1h3" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.toolbarIcon}>
      {paths[name]}
    </svg>
  );
}

export default function RichTextEditor({ value, onChange, disabled = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getJSON());
    },
  });

  if (!editor) return null;

  const handleHeadingChange = (event) => {
    const value = event.target.value;

    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }

    editor
      .chain()
      .focus()
      .toggleHeading({ level: Number(value) })
      .run();
  };

  const activeHeading = [1, 2, 3].find((level) =>
    editor.isActive('heading', { level })
  );

  return (
    <div className={styles.editorShell}>
      <div className={styles.toolbar} role="toolbar" aria-label="Text formatting">
        <label className={styles.headingControl}>
          <span className={styles.srOnly}>Text style</span>
          <select
            value={activeHeading ? String(activeHeading) : 'paragraph'}
            onChange={handleHeadingChange}
            disabled={disabled}
            aria-label="Text style"
          >
            <option value="paragraph">Normal text</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
          <span className={styles.chevron}>⌄</span>
        </label>

        <span className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? styles.activeButton : ''}
          disabled={disabled}
          aria-label="Bold"
          title="Bold"
        >
          <ToolbarIcon name="bold" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? styles.activeButton : ''}
          disabled={disabled}
          aria-label="Italic"
          title="Italic"
        >
          <ToolbarIcon name="italic" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? styles.activeButton : ''}
          disabled={disabled}
          aria-label="Underline"
          title="Underline"
        >
          <ToolbarIcon name="underline" />
        </button>

        <span className={styles.divider} aria-hidden="true" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? styles.activeButton : ''}
          disabled={disabled}
          aria-label="Bulleted list"
          title="Bulleted list"
        >
          <ToolbarIcon name="bullets" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? styles.activeButton : ''}
          disabled={disabled}
          aria-label="Numbered list"
          title="Numbered list"
        >
          <ToolbarIcon name="ordered" />
        </button>
      </div>

      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}
