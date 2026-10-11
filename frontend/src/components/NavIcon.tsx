import {
  BookOpen,
  Building2,
  GraduationCap,
  IdCard,
  LayoutGrid,
  Library,
  ListTree,
  Presentation,
  School,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "@/config/navigation";

const ICONS: Record<IconKey, LucideIcon> = {
  profile: UserRound,
  "my-course": GraduationCap,
  curriculum: ListTree,
  subjects: BookOpen,
  department: School,
  students: GraduationCap,
  teachers: Presentation,
  departments: Building2,
  courses: Library,
  staff: IdCard,
  users: Users,
  components: LayoutGrid,
};

interface NavIconProps {
  name: IconKey;
  className?: string;
}

export default function NavIcon({ name, className }: NavIconProps) {
  const Icon = ICONS[name] ?? LayoutGrid;
  return <Icon className={className} aria-hidden="true" />;
}
