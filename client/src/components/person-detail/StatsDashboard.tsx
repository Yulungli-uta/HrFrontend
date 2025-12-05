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

const stats = [
  { 
    label: "Publicaciones", 
    key: "publications" as const, 
    icon: FileText, 
    color: "blue" 
  },
  { 
    label: "Cargas Familiares", 
    key: "familyMembers" as const, 
    icon: Users, 
    color: "green" 
  },
  { 
    label: "Experiencias", 
    key: "workExperiences" as const, 
    icon: Briefcase, 
    color: "orange" 
  },
  { 
    label: "Capacitaciones", 
    key: "trainings" as const, 
    icon: GraduationCap, 
    color: "purple" 
  },
  { 
    label: "Libros", 
    key: "books" as const, 
    icon: BookOpen, 
    color: "red" 
  },
  { 
    label: "Contactos", 
    key: "emergencyContacts" as const, 
    icon: Phone, 
    color: "yellow" 
  },
];

export function StatsDashboard({ data }: StatsDashboardProps) {
  const colorClasses = {
    blue: "border-l-blue-500 bg-blue-50",
    green: "border-l-green-500 bg-green-50",
    orange: "border-l-orange-500 bg-orange-50",
    purple: "border-l-purple-500 bg-purple-50",
    red: "border-l-red-500 bg-red-50",
    yellow: "border-l-yellow-500 bg-yellow-50",
  };

  const iconColors = {
    blue: "text-blue-600",
    green: "text-green-600",
    orange: "text-orange-600",
    purple: "text-purple-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
      {stats.map((stat) => (
        <Card 
          key={stat.key} 
          className={`border-l-4 ${colorClasses[stat.color]} hover:shadow-sm transition-shadow duration-200`}
        >
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={`p-2 rounded-full bg-white`}>
              <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColors[stat.color]}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {data[stat.key].length}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}