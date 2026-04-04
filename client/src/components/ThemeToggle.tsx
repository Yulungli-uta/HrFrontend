// components/ThemeToggle.tsx
// Toggle de tema con diseño UX profesional y clases semánticas.
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-muted-foreground
                     hover:text-foreground hover:bg-accent
                     transition-all duration-200
                     focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Cambiar tema"
          title="Cambiar tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-40 bg-popover text-popover-foreground border border-border
                   shadow-lg rounded-xl p-1 animate-fade-in"
      >
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer
                      transition-colors duration-150
                      hover:bg-accent hover:text-accent-foreground
                      ${
                        theme === "light"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground"
                      }`}
        >
          <Sun className="h-4 w-4 shrink-0" />
          <span>Claro</span>
          {theme === "light" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer
                      transition-colors duration-150
                      hover:bg-accent hover:text-accent-foreground
                      ${
                        theme === "dark"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground"
                      }`}
        >
          <Moon className="h-4 w-4 shrink-0" />
          <span>Oscuro</span>
          {theme === "dark" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer
                      transition-colors duration-150
                      hover:bg-accent hover:text-accent-foreground
                      ${
                        theme === "system"
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-foreground"
                      }`}
        >
          <Monitor className="h-4 w-4 shrink-0" />
          <span>Sistema</span>
          {theme === "system" && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
