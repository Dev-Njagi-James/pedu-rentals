'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import styles from '../css/detailsTab.module.css';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export default function DescriptionRenderer({ description }) {
  const isTipTapDoc = description && typeof description === 'object' && description.type === 'doc';

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false, autolink: true })],
    content: isTipTapDoc ? description : EMPTY_DOC,
    editable: false,
    immediatelyRender: false,
  });

  if (!isTipTapDoc) {
    return description ? <p>{description}</p> : <p className={styles.empty}>No description provided.</p>;
  }

  if (!editor) return null;

  return <EditorContent editor={editor} className={styles.description} />;
}