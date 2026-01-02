/**
 * Types for data analysis results matching backend schemas
 */

export interface ColumnInfo {
  name: string;
  dtype: string;
  nullable: boolean;
}

export interface DataOverview {
  row_count: number;
  column_count: number;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
}

export interface SchemaInfo {
  columns: ColumnInfo[];
}

export interface SampleData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

export interface ColumnStatistics {
  column_name: string;
  dtype: string;
  count: number;
  unique_count: number | null;
  mean: number | null;
  std: number | null;
  min: number | string | null;
  max: number | string | null;
  median: number | null;
  q25: number | null;
  q75: number | null;
  top_value: string | null;
  top_frequency: number | null;
}

export interface StatisticalSummary {
  columns: ColumnStatistics[];
}

export interface NullColumn {
  column_name: string;
  null_count: number;
  null_percentage: number;
  non_null_count: number;
}

export interface NullAnalysis {
  total_cells: number;
  total_nulls: number;
  total_null_percentage: number;
  columns: NullColumn[];
}

export type AnalysisChunkType =
  | "overview"
  | "schema"
  | "sample"
  | "statistics"
  | "nulls"
  | "complete"
  | "error";

export interface AnalysisChunk {
  type: AnalysisChunkType;
  data?: DataOverview | SchemaInfo | SampleData | StatisticalSummary | NullAnalysis | null;
  message?: string | null;
}

export interface AnalysisState {
  overview: DataOverview | null;
  schema: SchemaInfo | null;
  sample: SampleData | null;
  statistics: StatisticalSummary | null;
  nulls: NullAnalysis | null;
  isComplete: boolean;
  error: string | null;
  currentStep: AnalysisChunkType | null;
}

