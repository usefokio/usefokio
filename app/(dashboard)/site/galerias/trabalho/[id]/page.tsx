"use client";

import { use } from "react";
import { TrabalhoForm } from "../_components/TrabalhoForm";

export default function EditarTrabalhoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <TrabalhoForm trabalhoId={id} />;
}
