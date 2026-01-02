import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Database,
  FileSpreadsheet,
  Hash,
  Table2,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Layers,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "./DataTable";
import { Progress } from "@/components/ui/progress";
import type {
  AnalysisState,
  ColumnInfo,
  ColumnStatistics,
  NullColumn,
} from "@/types/analysis";

interface DataAnalysisResultsProps {
  analysis: AnalysisState;
}

// Utility to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Utility to format numbers
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Section wrapper component
function AnalysisSection({
  title,
  icon: Icon,
  children,
  isLoading = false,
  delay = 0,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  isLoading?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "bg-card/50 backdrop-blur-sm rounded-xl border border-border/30 overflow-hidden",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 bg-muted/20">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {isLoading && (
          <div className="ml-auto flex items-center gap-2 text-muted-foreground text-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Loading...
          </div>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  icon: Icon,
  color = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: "primary" | "accent" | "secondary";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    secondary: "bg-secondary/10 text-secondary",
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/20">
      <div className={cn("p-3 rounded-lg", colorClasses[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// Data type badge
function TypeBadge({ dtype }: { dtype: string }) {
  const getTypeColor = (type: string) => {
    const t = type.toUpperCase();
    if (
      t.includes("INT") ||
      t.includes("FLOAT") ||
      t.includes("DOUBLE") ||
      t.includes("DECIMAL")
    )
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    if (t.includes("VARCHAR") || t.includes("STRING") || t.includes("TEXT"))
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (t.includes("DATE") || t.includes("TIME") || t.includes("TIMESTAMP"))
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (t.includes("BOOL"))
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-mono border",
        getTypeColor(dtype)
      )}
    >
      {dtype}
    </span>
  );
}

// Schema columns table
function SchemaTable({ columns }: { columns: ColumnInfo[] }) {
  const tableColumns: ColumnDef<ColumnInfo>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Column Name",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.getValue("name")}
          </span>
        ),
      },
      {
        accessorKey: "dtype",
        header: "Data Type",
        cell: ({ row }) => <TypeBadge dtype={row.getValue("dtype")} />,
      },
      {
        accessorKey: "nullable",
        header: "Nullable",
        cell: ({ row }) => {
          const isNullable = row.getValue("nullable");
          return (
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium border",
                isNullable
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
              )}
            >
              {isNullable ? "Yes" : "No"}
            </span>
          );
        },
      },
    ],
    []
  );

  return <DataTable columns={tableColumns} data={columns} />;
}

// Sample data table
function SampleDataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}) {
  const tableData = useMemo(
    () =>
      rows.map((row, idx) => {
        const obj: Record<string, unknown> = { _rowIndex: idx + 1 };
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      }),
    [columns, rows]
  );

  const tableColumns: ColumnDef<Record<string, unknown>>[] = useMemo(
    () => [
      {
        accessorKey: "_rowIndex",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.getValue("_rowIndex")}
          </span>
        ),
      },
      ...columns.map((col) => ({
        accessorKey: col,
        header: col,
        cell: ({ row }: { row: { getValue: (key: string) => unknown } }) => {
          const value = row.getValue(col);
          if (value === null || value === undefined) {
            return (
              <span className="text-muted-foreground/50 italic">null</span>
            );
          }
          const strValue = String(value);
          const truncated =
            strValue.length > 50 ? strValue.slice(0, 50) + "..." : strValue;
          return <span className="text-sm">{truncated}</span>;
        },
      })),
    ],
    [columns]
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={tableColumns} data={tableData} />
    </div>
  );
}

// Statistics table
function StatisticsTable({ columns }: { columns: ColumnStatistics[] }) {
  const tableColumns: ColumnDef<ColumnStatistics>[] = useMemo(
    () => [
      {
        accessorKey: "column_name",
        header: "Column",
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("column_name")}</span>
        ),
      },
      {
        accessorKey: "dtype",
        header: "Type",
        cell: ({ row }) => <TypeBadge dtype={row.getValue("dtype")} />,
      },
      {
        accessorKey: "count",
        header: "Count",
        cell: ({ row }) => formatNumber(row.getValue("count")),
      },
      {
        accessorKey: "unique_count",
        header: "Unique",
        cell: ({ row }) => formatNumber(row.getValue("unique_count")),
      },
      {
        accessorKey: "mean",
        header: "Mean",
        cell: ({ row }) => formatNumber(row.getValue("mean")),
      },
      {
        accessorKey: "std",
        header: "Std Dev",
        cell: ({ row }) => formatNumber(row.getValue("std")),
      },
      {
        accessorKey: "min",
        header: "Min",
        cell: ({ row }) => {
          const val = row.getValue("min");
          return val !== null && val !== undefined ? String(val) : "—";
        },
      },
      {
        accessorKey: "max",
        header: "Max",
        cell: ({ row }) => {
          const val = row.getValue("max");
          return val !== null && val !== undefined ? String(val) : "—";
        },
      },
    ],
    []
  );

  return (
    <div className="overflow-x-auto">
      <DataTable columns={tableColumns} data={columns} />
    </div>
  );
}

// Null analysis table with visual bars
function NullAnalysisTable({
  columns,
  totalPercentage,
}: {
  columns: NullColumn[];
  totalPercentage: number;
}) {
  const sortedColumns = useMemo(
    () => [...columns].sort((a, b) => b.null_percentage - a.null_percentage),
    [columns]
  );

  return (
    <div className="space-y-6">
      {/* Overall summary */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border/20">
        <div
          className={cn(
            "p-3 rounded-lg",
            totalPercentage > 10
              ? "bg-destructive/10 text-destructive"
              : "bg-accent/10 text-accent"
          )}
        >
          {totalPercentage > 10 ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            Overall Data Completeness
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Progress value={100 - totalPercentage} className="flex-1 h-2" />
            <span className="text-sm font-medium text-foreground">
              {(100 - totalPercentage).toFixed(1)}% complete
            </span>
          </div>
        </div>
      </div>

      {/* Per-column breakdown */}
      <div className="space-y-3">
        {sortedColumns.map((col) => (
          <div
            key={col.column_name}
            className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/10"
          >
            <span className="font-medium text-sm w-40 truncate">
              {col.column_name}
            </span>
            <div className="flex-1">
              <Progress value={100 - col.null_percentage} className="h-2" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[140px] justify-end">
              <span>{col.null_count.toLocaleString()} nulls</span>
              <span
                className={cn(
                  "font-medium",
                  col.null_percentage > 20
                    ? "text-destructive"
                    : col.null_percentage > 5
                    ? "text-amber-500"
                    : "text-accent"
                )}
              >
                ({col.null_percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataAnalysisResults({ analysis }: DataAnalysisResultsProps) {
  const { overview, schema, sample, statistics, nulls, error, currentStep } =
    analysis;

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-xl">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-destructive font-medium">Analysis Error</span>
        </div>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Data Overview */}
      {overview && (
        <AnalysisSection
          title="Data Overview"
          icon={Database}
          delay={0}
          isLoading={currentStep === "overview"}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Rows"
              value={overview.row_count.toLocaleString()}
              icon={Layers}
              color="primary"
            />
            <StatCard
              label="Total Columns"
              value={overview.column_count.toString()}
              icon={Table2}
              color="accent"
            />
            <StatCard
              label="File Size"
              value={formatFileSize(overview.file_size_bytes)}
              icon={HardDrive}
              color="secondary"
            />
            <StatCard
              label="File Type"
              value={overview.file_type.toUpperCase()}
              icon={FileSpreadsheet}
              color="primary"
            />
          </div>
        </AnalysisSection>
      )}

      {/* Schema */}
      {schema && (
        <AnalysisSection
          title="Schema"
          icon={Hash}
          delay={100}
          isLoading={currentStep === "schema"}
        >
          <SchemaTable columns={schema.columns} />
        </AnalysisSection>
      )}

      {/* Sample Data */}
      {sample && (
        <AnalysisSection
          title="Sample Data"
          icon={Table2}
          delay={200}
          isLoading={currentStep === "sample"}
        >
          <p className="text-sm text-muted-foreground mb-4">
            Showing first {sample.rows.length} rows
          </p>
          <SampleDataTable columns={sample.columns} rows={sample.rows} />
        </AnalysisSection>
      )}

      {/* Statistical Summary */}
      {statistics && (
        <AnalysisSection
          title="Statistical Summary"
          icon={BarChart3}
          delay={300}
          isLoading={currentStep === "statistics"}
        >
          <StatisticsTable columns={statistics.columns} />
        </AnalysisSection>
      )}

      {/* Null Analysis */}
      {nulls && (
        <AnalysisSection
          title="Null Analysis"
          icon={TrendingUp}
          delay={400}
          isLoading={currentStep === "nulls"}
        >
          <NullAnalysisTable
            columns={nulls.columns}
            totalPercentage={nulls.total_null_percentage}
          />
        </AnalysisSection>
      )}
    </div>
  );
}
