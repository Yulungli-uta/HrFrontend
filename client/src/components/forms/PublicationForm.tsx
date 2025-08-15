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
import type { Publication, InsertPublication } from "@shared/schema";

const publicationFormSchema = z.object({
  personId: z.number(),
  title: z.string().min(1, "El título es requerido"),
  journal: z.string().optional(),
  publicationDate: z.string().optional(),
  issn: z.string().optional(),
  doi: z.string().optional(),
  url: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
});

interface PublicationFormProps {
  personId: number;
  publication?: Publication;
  onSubmit: (data: InsertPublication) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function PublicationForm({
  personId,
  publication,
  onSubmit,
  onCancel,
  isLoading = false,
}: PublicationFormProps) {
  const form = useForm<InsertPublication>({
    resolver: zodResolver(publicationFormSchema),
    defaultValues: publication ? {
      ...publication,
    } : {
      personId,
      title: "",
      journal: "",
      publicationDate: "",
      issn: "",
      doi: "",
      url: "",
      type: "",
      description: "",
    },
  });

  const handleSubmit = async (data: InsertPublication) => {
    try {
      await onSubmit(data);
      if (!publication) {
        form.reset();
      }
    } catch (error) {
      console.error("Error submitting publication:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Título de la Publicación</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="journal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revista/Publicación</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-journal" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Artículo científico, libro, capítulo, etc." data-testid="input-type" />
                </FormControl>
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
            name="doi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DOI</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="10.1000/example" data-testid="input-doi" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ISSN</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-issn" />
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
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input {...field} type="url" placeholder="https://..." data-testid="input-url" />
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
                <Textarea {...field} rows={4} data-testid="textarea-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Guardando..." : publication ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}