"use client";

import { use } from "react";
import { PostForm } from "../_components/PostForm";

export default function EditarPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PostForm postId={id} />;
}
