export type Client = {
  id: number;
  name: string;
  email: string;
  avatar: string;
};

export type SelecaoGaleria = {
  id: number;
  name: string;
  client: string;
  avatar: string;
  date: string;
  total: number;
  selected: number;
  limit: number;
  status: string;
  expires: string | null;
  cover: string;
  files: string[];
};

export type EntregaGaleria = {
  id: number;
  name: string;
  client: string;
  avatar: string;
  date: string;
  photos: number;
  size: string;
  status: string;
  downloads: number;
  cover: string;
};

export type Activity = {
  id: number;
  text: string;
  time: string;
  color: string;
};

export type Photo = {
  id: number;
  name: string;
  color: string;
};

export const MOCK_CLIENTS: Client[] = [
  { id: 1, name: "Ana Beatriz Souza", email: "ana@email.com",      avatar: "AB" },
  { id: 2, name: "Carlos Mendonça",   email: "carlos@email.com",   avatar: "CM" },
  { id: 3, name: "Fernanda Lima",     email: "fernanda@email.com", avatar: "FL" },
  { id: 4, name: "Isabela Rocha",     email: "isabela@email.com",  avatar: "IR" },
  { id: 5, name: "Marina Costa",      email: "marina@email.com",   avatar: "MC" },
  { id: 6, name: "Lucas Ferreira",    email: "lucas@email.com",    avatar: "LF" },
];

export const MOCK_SELECAO: SelecaoGaleria[] = [
  {
    id: 1,
    name: "Casamento Ana & Pedro",
    client: "Ana Beatriz Souza",
    avatar: "AB",
    date: "12 Mai 2025",
    total: 347,
    selected: 89,
    limit: 100,
    status: "Concluída",
    expires: null,
    cover: "#7C6E5A",
    files: [
      "DSC_0001.jpg","DSC_0018.jpg","DSC_0034.jpg","DSC_0047.jpg","DSC_0062.jpg",
      "DSC_0078.jpg","DSC_0091.jpg","DSC_0105.jpg","DSC_0119.jpg","DSC_0133.jpg",
      "DSC_0148.jpg","DSC_0162.jpg","DSC_0177.jpg","DSC_0190.jpg","DSC_0204.jpg",
      "DSC_0218.jpg","DSC_0231.jpg","DSC_0245.jpg","DSC_0259.jpg","DSC_0273.jpg",
      "DSC_0288.jpg","DSC_0301.jpg","DSC_0315.jpg","DSC_0328.jpg","DSC_0342.jpg",
    ],
  },
  {
    id: 2,
    name: "Ensaio Gestante",
    client: "Fernanda Lima",
    avatar: "FL",
    date: "05 Mai 2025",
    total: 124,
    selected: 22,
    limit: 40,
    status: "Em andamento",
    expires: "5 dias",
    cover: "#5A6E7C",
    files: [],
  },
  {
    id: 3,
    name: "15 Anos — Sofia",
    client: "Carlos Mendonça",
    avatar: "CM",
    date: "28 Abr 2025",
    total: 218,
    selected: 0,
    limit: 60,
    status: "Não iniciada",
    expires: "7 dias",
    cover: "#6E5A7C",
    files: [],
  },
  {
    id: 4,
    name: "Newborn — Théo",
    client: "Marina Costa",
    avatar: "MC",
    date: "08 Jun 2025",
    total: 96,
    selected: 12,
    limit: 25,
    status: "Em andamento",
    expires: "3 dias",
    cover: "#6E7C5A",
    files: [],
  },
];

export const MOCK_ENTREGA: EntregaGaleria[] = [
  {
    id: 1,
    name: "Casamento Ana & Pedro",
    client: "Ana Beatriz Souza",
    avatar: "AB",
    date: "20 Mai 2025",
    photos: 89,
    size: "2.4 GB",
    status: "Entregue",
    downloads: 14,
    cover: "#7C6E5A",
  },
  {
    id: 2,
    name: "Book Executivo",
    client: "Isabela Rocha",
    avatar: "IR",
    date: "10 Jun 2025",
    photos: 30,
    size: "820 MB",
    status: "Disponível",
    downloads: 3,
    cover: "#5A7C6E",
  },
  {
    id: 3,
    name: "Ensaio Gestante",
    client: "Fernanda Lima",
    avatar: "FL",
    date: "15 Jun 2025",
    photos: 40,
    size: "1.1 GB",
    status: "Preparando",
    downloads: 0,
    cover: "#5A6E7C",
  },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: 1, text: "Fernanda Lima iniciou a seleção (22 de 40)",           time: "1h atrás", color: "#3B82F6" },
  { id: 2, text: "Ana Beatriz concluiu a seleção — 89 fotos escolhidas", time: "3h atrás", color: "#10B981" },
  { id: 3, text: "Galeria de entrega enviada para Isabela Rocha",        time: "1d atrás", color: "#8B5CF6" },
  { id: 4, text: "Seleção 'Newborn — Théo' expira em 3 dias",           time: "1d atrás", color: "#EF4444" },
  { id: 5, text: "Nova galeria publicada: '15 Anos — Sofia'",            time: "2d atrás", color: "#6B7280" },
];

export const MOCK_PHOTOS: Photo[] = Array.from({ length: 24 }, (_, i) => ({
  id: i + 1,
  name: `DSC_${String(i + 1).padStart(4, "0")}.jpg`,
  color: [
    "#c9b99a","#9ab3c9","#b99ac9","#9ac9b9","#c99a9a","#aac99a",
    "#c9aab3","#9abac9","#c9b39a","#a9c99a","#c99ab9","#9ac9c9",
    "#c9c49a","#9ac9b0","#c9a09a","#b0c99a","#9ab9c9","#c99ab0",
    "#c9b09a","#9ac0c9","#c9a9b9","#a9b9c9","#c9b9a0","#a0c9c9",
  ][i],
}));

export const CATEGORIES = [
  "Casamento","Ensaio","15 Anos","Newborn","Book",
  "Família","Formatura","Corporativo","Outro",
];

export const CLIENT_SESSIONS  = [8, 3, 12, 6, 9, 4];
export const CLIENT_LAST_DATE = [
  "12 Mai 2025","28 Abr 2025","05 Mai 2025",
  "01 Jun 2025","08 Jun 2025","22 Abr 2025",
];
export const CLIENT_STATUS = ["Ativo","Ativo","Ativo","Ativo","Ativo","Pendente"];
