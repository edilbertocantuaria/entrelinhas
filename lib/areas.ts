import {
  Activity, Apple, Baby, BookOpen, Brain, Briefcase, Brush, Building2, CalendarDays, Camera, Clapperboard, CloudSun,
  Coins, Dog, Dumbbell, Flower2, Gift, GraduationCap, HandCoins, Handshake, Heart, HeartPulse, Home, Landmark,
  Languages, Laptop, Leaf, Library, Mail, MessageCircle, Moon, Music, NotebookPen, Palette, PenTool, PencilRuler,
  PiggyBank, Plane, Rocket, Smile, Sparkles, Stethoscope, Sun, Target, TrendingUp, User, Users, Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ColorKey } from './types'

export const COLOR_PRESETS: { key: ColorKey; label: string; light: string; dark: string }[] = [
  { key: 'verde', label: 'Verde', light: '#4F8A4C', dark: '#7DBB79' },
  { key: 'mar', label: 'Mar', light: '#0E97AA', dark: '#34C0D0' },
  { key: 'tijolo', label: 'Tijolo', light: '#C4693F', dark: '#E08A60' },
  { key: 'celeste', label: 'Celeste', light: '#5BBDE8', dark: '#7CCDF0' },
  { key: 'periwinkle', label: 'Periwinkle', light: '#7B8CC4', dark: '#9AA8DC' },
  { key: 'azul-cinza', label: 'Azul-cinza', light: '#8AA9B8', dark: '#A3C0CE' },
  { key: 'ambar', label: 'Âmbar', light: '#D9A650', dark: '#E6BB6A' },
  { key: 'lavanda', label: 'Lavanda', light: '#9C8CC9', dark: '#B2A5DC' },
  { key: 'musgo', label: 'Musgo', light: '#6B8F71', dark: '#8FB596' },
  { key: 'areia', label: 'Areia', light: '#B59A7A', dark: '#D1B795' },
]

/** Os valores claro/escuro vivem em globals.css como --area-{chave}. */
export const areaColor = (key: ColorKey | undefined) => `var(--area-${key ?? 'azul-cinza'})`

type IconDef = { name: string; label: string; icon: LucideIcon }

export const ICON_GROUPS: { name: string; icons: IconDef[] }[] = [
  {
    name: 'Saúde',
    icons: [
      { name: 'heart-pulse', label: 'Coração e pulso', icon: HeartPulse },
      { name: 'dumbbell', label: 'Halter', icon: Dumbbell },
      { name: 'apple', label: 'Maçã', icon: Apple },
      { name: 'moon', label: 'Lua', icon: Moon },
      { name: 'activity', label: 'Atividade', icon: Activity },
      { name: 'stethoscope', label: 'Estetoscópio', icon: Stethoscope },
    ],
  },
  {
    name: 'Finanças',
    icons: [
      { name: 'wallet', label: 'Carteira', icon: Wallet },
      { name: 'piggy-bank', label: 'Cofrinho', icon: PiggyBank },
      { name: 'trending-up', label: 'Crescimento', icon: TrendingUp },
      { name: 'landmark', label: 'Banco', icon: Landmark },
      { name: 'coins', label: 'Moedas', icon: Coins },
      { name: 'hand-coins', label: 'Moeda na mão', icon: HandCoins },
    ],
  },
  {
    name: 'Estudo',
    icons: [
      { name: 'graduation-cap', label: 'Capelo', icon: GraduationCap },
      { name: 'book-open', label: 'Livro aberto', icon: BookOpen },
      { name: 'languages', label: 'Idiomas', icon: Languages },
      { name: 'library', label: 'Biblioteca', icon: Library },
      { name: 'pencil-ruler', label: 'Lápis e régua', icon: PencilRuler },
      { name: 'notebook-pen', label: 'Caderno', icon: NotebookPen },
    ],
  },
  {
    name: 'Trabalho',
    icons: [
      { name: 'briefcase', label: 'Pasta', icon: Briefcase },
      { name: 'laptop', label: 'Computador', icon: Laptop },
      { name: 'rocket', label: 'Foguete', icon: Rocket },
      { name: 'building-2', label: 'Prédio', icon: Building2 },
      { name: 'target', label: 'Alvo', icon: Target },
      { name: 'calendar-days', label: 'Calendário', icon: CalendarDays },
    ],
  },
  {
    name: 'Pessoal',
    icons: [
      { name: 'user', label: 'Pessoa', icon: User },
      { name: 'home', label: 'Casa', icon: Home },
      { name: 'sparkles', label: 'Brilhos', icon: Sparkles },
      { name: 'plane', label: 'Avião', icon: Plane },
      { name: 'heart', label: 'Coração', icon: Heart },
      { name: 'gift', label: 'Presente', icon: Gift },
    ],
  },
  {
    name: 'Mente',
    icons: [
      { name: 'brain', label: 'Cérebro', icon: Brain },
      { name: 'leaf', label: 'Folha', icon: Leaf },
      { name: 'smile', label: 'Sorriso', icon: Smile },
      { name: 'flower-2', label: 'Flor', icon: Flower2 },
      { name: 'sun', label: 'Sol', icon: Sun },
      { name: 'cloud-sun', label: 'Sol entre nuvens', icon: CloudSun },
    ],
  },
  {
    name: 'Social',
    icons: [
      { name: 'users', label: 'Pessoas', icon: Users },
      { name: 'message-circle', label: 'Conversa', icon: MessageCircle },
      { name: 'handshake', label: 'Aperto de mãos', icon: Handshake },
      { name: 'baby', label: 'Bebê', icon: Baby },
      { name: 'dog', label: 'Cachorro', icon: Dog },
      { name: 'mail', label: 'Carta', icon: Mail },
    ],
  },
  {
    name: 'Criativo',
    icons: [
      { name: 'palette', label: 'Paleta', icon: Palette },
      { name: 'music', label: 'Música', icon: Music },
      { name: 'camera', label: 'Câmera', icon: Camera },
      { name: 'pen-tool', label: 'Caneta', icon: PenTool },
      { name: 'clapperboard', label: 'Claquete', icon: Clapperboard },
      { name: 'brush', label: 'Pincel', icon: Brush },
    ],
  },
]

const ICONS: Record<string, LucideIcon> = Object.fromEntries(
  ICON_GROUPS.flatMap(group => group.icons.map(def => [def.name, def.icon])),
)

export const areaIcon = (name: string | undefined): LucideIcon => (name && ICONS[name]) || Target

export const MAX_ACTIVE_AREAS = 12
export const MAX_AREA_NAME = 24
