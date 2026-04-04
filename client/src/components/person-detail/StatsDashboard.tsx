// client/src/components/person-detail/StatsDashboard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Users, Briefcase, GraduationCap, BookOpen, Phone } from "lucide-react";

interface StatsDashboardProps {
  data: {
    publications: any[];
    familyMembers: any[];
    workExperiences: any[];
    trainings: any[];
    books: any[];
    emergencyContacts: any[];
  };
}

type StatColor = "blue" | "green" | "orange" | "purple" | "red" | "yellow";

const stats: Array<{
  label: string;
  key: keyof StatsDashboardProps["data"];
  icon: typeof FileText;
  color: StatColor;
}> = [
  {
    label: "Publicaciones",
    key: "publications",
    icon: FileText,
    color: "blue",
  },
  {
    label: "Cargas Familiares",
    key: "familyMembers",
    icon: Users,
    color: "green",
  },
  {
    label: "Experiencias",
    key: "workExperiences",
    icon: Briefcase,
    color: "orange",
  },
  {
    label: "Capacitaciones",
    key: "trainings",
    icon: GraduationCap,
    color: "purple",
  },
  {
    label: "Libros",
    key: "books",
    icon: BookOpen,
    color: "red",
  },
  {
    label: "Contactos",
    key: "emergencyContacts",
    icon: Phone,
    color: "yellow",
  },
];

export function StatsDashboard({ data }: StatsDashboardProps) {
  const colorClasses: Record<StatColor, string> = {
    blue: "border-l-blue-500 bg-primary/10",
    green: "border-l-green-500 bg-success/10",
    orange: "border-l-orange-500 bg-secondary/10",
    purple: "border-l-purple-500 bg-accent/50",
    red: "border-l-red-500 bg-destructive/10",
    yellow: "border-l-yellow-500 bg-warning/10",
  };

  const iconColors: Record<StatColor, string> = {
    blue: "text-primary",
    green: "text-success",
    orange: "text-secondary-foreground",
    purple: "text-purple-600",
    red: "text-destructive",
    yellow: "text-warning",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {stats.map((stat) => (
        <Card
          key={stat.key}
          className={`border-l-4 ${colorClasses[stat.color]} hover:shadow-sm transition-shadow duration-200`}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-full bg-card">
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColors[stat.color]}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground truncate">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold text-foreground truncate">
                {data[stat.key].length}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}