import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";

/**
 * A titled content panel with an optional action slot. Used for dashboard
 * widgets and list panels so every card reads consistently.
 */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      {(title || action) && (
        <CardHeader className="border-b py-4">
          {title ? <CardTitle className="text-base">{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "py-4", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
