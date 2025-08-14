import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, User, Calendar } from "lucide-react";

export default function OvertimePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Horas Extra</h1>
          <p className="text-gray-600 mt-2">Administre las horas extra trabajadas por los empleados</p>
        </div>
        <Button 
          data-testid="button-add-overtime"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Registrar Horas Extra
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-5 w-5 text-blue-600" />
              Total Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">156</div>
            <p className="text-sm text-gray-500">horas este mes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <User className="mr-2 h-5 w-5 text-green-600" />
              Empleados Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">24</div>
            <p className="text-sm text-gray-500">con horas extra</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-orange-600" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">8</div>
            <p className="text-sm text-gray-500">por aprobar</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Registros Recientes de Horas Extra</CardTitle>
          <CardDescription>
            Lista de las últimas horas extra registradas en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg mb-2">No hay registros disponibles</p>
            <p className="text-sm">Los registros de horas extra aparecerán aquí una vez que se implementen las funciones CRUD</p>
            <Button 
              variant="outline" 
              className="mt-4"
              data-testid="button-add-first-overtime"
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primer Registro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}