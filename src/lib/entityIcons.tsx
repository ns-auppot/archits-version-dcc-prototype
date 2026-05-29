import {
  FileText,
  Columns2,
  MessageSquare,
  Database,
  Monitor,
  UserCircle2,
  AppWindow,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import { type EntityType } from '@/types/topology'

export const ENTITY_ICONS: Record<EntityType, LucideIcon> = {
  'file':         FileText,
  'column':       Columns2,
  'chat-message': MessageSquare,
  'data-store':   Database,
  'device':       Monitor,
  'identity':     UserCircle2,
  'application':  AppWindow,
  'website':      Globe,
}
