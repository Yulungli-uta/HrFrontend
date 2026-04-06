import { FileText, Image, FileSpreadsheet, File, FileCode, Presentation } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type FileCategory = "pdf" | "image" | "spreadsheet" | "presentation" | "code" | "other";

function getFileCategory(ext: string | null | undefined): FileCategory {
  if (!ext) return "other";
  const e = ext.toLowerCase().replace(/^\./, "");
  if (e === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "tiff"].includes(e)) return "image";
  if (["xls", "xlsx", "csv", "ods"].includes(e)) return "spreadsheet";
  if (["ppt", "pptx", "odp"].includes(e)) return "presentation";
  if (["json", "xml", "html", "htm", "js", "ts", "css"].includes(e)) return "code";
  return "other";
}

function getCategoryConfig(cat: FileCategory) {
  switch (cat) {
    case "pdf":
      return {
        Icon: FileText,
        bg: "bg-destructive/10 dark:bg-red-950/40",
        border: "border-destructive/30 dark:border-red-800/50",
        iconColor: "text-destructive dark:text-destructive/80",
        label: "PDF",
        lineColor: "bg-destructive/20/60 dark:bg-red-800/40",
      };
    case "image":
      return {
        Icon: Image,
        bg: "bg-primary/10 dark:bg-blue-950/40",
        border: "border-primary/30 dark:border-blue-800/50",
        iconColor: "text-primary dark:text-primary/70",
        label: "IMG",
        lineColor: "bg-blue-200/60 dark:bg-primary/80/40",
      };
    case "spreadsheet":
      return {
        Icon: FileSpreadsheet,
        bg: "bg-success/10 dark:bg-green-950/40",
        border: "border-success/30 dark:border-green-800/50",
        iconColor: "text-success dark:text-success/80",
        label: "XLS",
        lineColor: "bg-success/20/60 dark:bg-green-800/40",
      };
    case "presentation":
      return {
        Icon: Presentation,
        bg: "bg-secondary/10 dark:bg-orange-950/40",
        border: "border-warning/30 dark:border-orange-800/50",
        iconColor: "text-orange-500 dark:text-orange-400",
        label: "PPT",
        lineColor: "bg-orange-200/60 dark:bg-orange-800/40",
      };
    case "code":
      return {
        Icon: FileCode,
        bg: "bg-accent/50 dark:bg-purple-950/40",
        border: "border-secondary/30 dark:border-purple-800/50",
        iconColor: "text-purple-500 dark:text-purple-400",
        label: "COD",
        lineColor: "bg-purple-200/60 dark:bg-purple-800/40",
      };
    default:
      return {
        Icon: File,
        bg: "bg-background dark:bg-background/40",
        border: "border-border dark:border-gray-700/50",
        iconColor: "text-muted-foreground dark:text-muted-foreground/70",
        label: "DOC",
        lineColor: "bg-muted/60 dark:bg-muted/40",
      };
  }
}

interface DocumentThumbnailProps {
  documentId: string | number;
  fileExtension?: string | null;
  title: string;
  onClick?: () => void;
  className?: string;
}

export function DocumentThumbnail({ documentId, fileExtension, title, onClick, className = "" }: DocumentThumbnailProps) {
  const cat = getFileCategory(fileExtension);
  const config = getCategoryConfig(cat);
  const { Icon, bg, border, iconColor, label, lineColor } = config;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
          className={`
            relative flex flex-col items-center justify-between
            w-14 aspect-[3/4] shrink-0 rounded-[4px] border overflow-hidden
            cursor-pointer select-none
            ${bg} ${border} ${className}
          `}
          data-testid={`button-doc-thumbnail-${documentId}`}
        >
          <div className="flex flex-col items-start w-full px-1.5 pt-1.5 gap-[3px]">
            <div className={`h-[2px] w-full rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-[85%] rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-[70%] rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-full rounded-full ${lineColor}`} />
            <div className={`h-[2px] w-[60%] rounded-full ${lineColor}`} />
          </div>

          <div className="flex flex-col items-center pb-1">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <span className={`text-[8px] font-bold uppercase leading-none mt-0.5 ${iconColor}`}>
              {label}
            </span>
          </div>

          <div className="absolute top-0 right-0 w-3 h-3">
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[12px] border-r-[12px] border-t-white dark:border-t-gray-900 border-r-transparent" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs">Vista previa: {title}</p>
      </TooltipContent>
    </Tooltip>
  );
}
