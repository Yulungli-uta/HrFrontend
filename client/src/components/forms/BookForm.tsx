import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Book, InsertBook } from "@shared/schema";

const bookFormSchema = z.object({
  personId: z.number(),
  title: z.string().min(1, "El título es requerido"),
  isbn: z.string().optional(),
  publisher: z.string().optional(),
  publicationDate: z.string().optional(),
  coAuthors: z.string().optional(),
  category: z.string().min(1, "La categoría es requerida"),
  description: z.string().optional(),
  url: z.string().optional(),
});

interface BookFormProps {
  personId: number;
  book?: Book;
  onSubmit: (data: InsertBook) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BookForm({
  personId,
  book,
  onSubmit,
  onCancel,
  isLoading = false,
}: BookFormProps) {
  const form = useForm<InsertBook>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: book ? {
      ...book,
    } : {
      personId,
      title: "",
      isbn: "",
      publisher: "",
      publicationDate: "",
      coAuthors: "",
      category: "",
      description: "",
      url: "",
    },
  });

  const handleSubmit = async (data: InsertBook) => {
    try {
      await onSubmit(data);
      if (!book) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting book:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input {...field} data-testid="input-title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="coAuthors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Co-autores</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Separar con comas" data-testid="input-co-authors" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isbn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISBN</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-isbn" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publisher"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Editorial</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-publisher" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Libro de Texto">Libro de Texto</SelectItem>
                    <SelectItem value="Libro de Investigación">Libro de Investigación</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Guía">Guía</SelectItem>
                    <SelectItem value="Ensayo">Ensayo</SelectItem>
                    <SelectItem value="Antología">Antología</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publicationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Publicación</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-publication-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL del Libro</FormLabel>
                <FormControl>
                  <Input {...field} type="url" data-testid="input-url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} data-testid="textarea-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Guardando..." : book ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}