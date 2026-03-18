import React from "react";
import type { SchemaResponse, FieldDef } from "@clawface/shared";
import { useRecord, useDeleteRecord } from "@clawface/react-sdk/react";
import { Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RecordDetailViewProps {
  schema: SchemaResponse;
  recordId: string;
  onEdit: () => void;
  onDelete: () => void;
}

function renderValue(value: unknown, fieldDef: FieldDef): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground italic">Not set</span>;
  }
  switch (fieldDef.type) {
    case "boolean":
      return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
    case "date":
      return typeof value === "string" ? new Date(value).toLocaleDateString() : String(value);
    case "array":
      if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-muted-foreground italic">Empty</span>;
        return (
          <div className="flex gap-1.5 flex-wrap">
            {value.map((item, i) => (
              <Badge key={i} variant="outline">{String(item)}</Badge>
            ))}
          </div>
        );
      }
      return String(value);
    case "string":
      if (fieldDef.inputType === "select") {
        return <Badge variant="secondary">{String(value)}</Badge>;
      }
      if (fieldDef.inputType === "textarea") {
        return <p className="whitespace-pre-wrap text-sm">{String(value)}</p>;
      }
      return <span className="text-sm">{String(value)}</span>;
    case "object":
      return <pre className="text-xs bg-muted p-2 rounded-md overflow-auto">{JSON.stringify(value, null, 2)}</pre>;
    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

export function RecordDetailView({ schema, recordId, onEdit, onDelete }: RecordDetailViewProps): React.JSX.Element {
  const { data: record, isLoading } = useRecord(recordId);
  const deleteRecord = useDeleteRecord();

  const handleDelete = async () => {
    try {
      await deleteRecord.mutate(recordId);
      toast.success("Record deleted");
      onDelete();
    } catch {
      toast.error("Failed to delete record");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">Record not found.</p>
        </CardContent>
      </Card>
    );
  }

  const sortedFields = Object.entries(schema.fields).sort(
    ([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0),
  );

  const groups = schema.groups ?? [];
  const hasGroups = groups.length > 0;

  // Partition fields by group
  const groupedFields = new Map<string, Array<[string, FieldDef]>>();
  const ungrouped: Array<[string, FieldDef]> = [];

  for (const [key, fieldDef] of sortedFields) {
    if (hasGroups && fieldDef.group) {
      const arr = groupedFields.get(fieldDef.group) ?? [];
      arr.push([key, fieldDef]);
      groupedFields.set(fieldDef.group, arr);
    } else {
      ungrouped.push([key, fieldDef]);
    }
  }

  const renderFields = (fields: Array<[string, FieldDef]>) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
      {fields.map(([key, fieldDef]) => (
        <div key={key} className={fieldDef.inputType === "textarea" ? "sm:col-span-2" : ""}>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {fieldDef.label ?? key}
          </dt>
          <dd>{renderValue(record.data[key], fieldDef)}</dd>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete record?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Record card */}
      <Card>
        <CardContent className="pt-6">
          {hasGroups ? (
            <div className="space-y-6">
              {[...groups].sort((a, b) => a.order - b.order).map((group) => {
                const fields = groupedFields.get(group.key) ?? [];
                if (fields.length === 0) return null;
                return (
                  <div key={group.key}>
                    <h3 className="text-sm font-semibold mb-3">{group.label}</h3>
                    {renderFields(fields)}
                  </div>
                );
              })}
              {ungrouped.length > 0 && renderFields(ungrouped)}
            </div>
          ) : (
            renderFields(ungrouped)
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Created {new Date(record.createdAt).toLocaleString()}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Updated {new Date(record.updatedAt).toLocaleString()}
        </div>
        <span className="font-mono text-[10px] opacity-50">{record.id}</span>
      </div>
    </div>
  );
}
