"""Data analysis service using DuckDB."""

import json
from pathlib import Path
from typing import AsyncGenerator

import duckdb

from app.schemas.analysis import (
    AnalysisChunk,
    ColumnInfo,
    ColumnStatistics,
    DataOverview,
    NullAnalysis,
    NullColumn,
    SampleData,
    SchemaInfo,
    StatisticalSummary,
)


class DataAnalyzer:
    """Analyze data files using DuckDB."""

    def __init__(self, file_path: str):
        """Initialize the analyzer with a file path."""
        self.file_path = file_path
        self.path = Path(file_path)
        self.con: duckdb.DuckDBPyConnection | None = None
        self.table_name = "data"

    def _setup_connection(self) -> None:
        """Setup DuckDB connection based on file type."""
        suffix = self.path.suffix.lower()

        if suffix in (".duckdb", ".db"):
            self.con = duckdb.connect(str(self.path), read_only=True)
            tables = [row[0] for row in self.con.execute("SHOW TABLES").fetchall()]
            if tables:
                self.table_name = tables[0]
        else:
            self.con = duckdb.connect()
            self.con.execute(f"CREATE VIEW data AS SELECT * FROM '{self.file_path}'")
            self.table_name = "data"

    def _close_connection(self) -> None:
        """Close the DuckDB connection."""
        if self.con:
            self.con.close()
            self.con = None

    def get_overview(self) -> DataOverview:
        """Get high-level overview of the dataset."""
        row_count = self.con.execute(f"SELECT COUNT(*) FROM {self.table_name}").fetchone()[0]
        schema = self.con.execute(f"DESCRIBE {self.table_name}").fetchall()
        col_count = len(schema)

        file_size = self.path.stat().st_size
        file_type = self.path.suffix.lower().lstrip(".")

        return DataOverview(
            row_count=row_count,
            column_count=col_count,
            file_name=self.path.name,
            file_size_bytes=file_size,
            file_type=file_type,
        )

    def get_schema(self) -> SchemaInfo:
        """Get schema information for the dataset."""
        schema = self.con.execute(f"DESCRIBE {self.table_name}").fetchall()

        columns = []
        for row in schema:
            col_name = row[0]
            col_type = row[1]
            nullable = row[2] == "YES" if len(row) > 2 else True

            columns.append(ColumnInfo(name=col_name, dtype=col_type, nullable=nullable))

        return SchemaInfo(columns=columns)

    def get_sample_data(self, limit: int = 10) -> SampleData:
        """Get sample rows from the dataset."""
        result = self.con.execute(f"SELECT * FROM {self.table_name} LIMIT {limit}").fetchall()
        schema = self.con.execute(f"DESCRIBE {self.table_name}").fetchall()

        columns = [row[0] for row in schema]

        # Convert rows to JSON-serializable format
        rows = []
        for row in result:
            converted_row = []
            for val in row:
                if val is None:
                    converted_row.append(None)
                elif isinstance(val, (int, float, str, bool)):
                    converted_row.append(val)
                else:
                    converted_row.append(str(val))
            rows.append(converted_row)

        return SampleData(columns=columns, rows=rows)

    def get_statistics(self) -> StatisticalSummary:
        """Get statistical summary for the dataset."""
        schema = self.con.execute(f"DESCRIBE {self.table_name}").fetchall()

        column_stats = []
        for row in schema:
            col_name = row[0]
            col_type = row[1].upper()

            # Get basic counts
            count_result = self.con.execute(
                f'SELECT COUNT(*), COUNT(DISTINCT "{col_name}") FROM {self.table_name}'
            ).fetchone()
            count = count_result[0]
            unique_count = count_result[1]

            stats = ColumnStatistics(
                column_name=col_name,
                dtype=col_type,
                count=count,
                unique_count=unique_count,
            )

            # Check if numeric type
            is_numeric = any(
                t in col_type
                for t in [
                    "INT",
                    "BIGINT",
                    "SMALLINT",
                    "TINYINT",
                    "FLOAT",
                    "DOUBLE",
                    "DECIMAL",
                    "NUMERIC",
                    "REAL",
                    "HUGEINT",
                    "UBIGINT",
                    "UINTEGER",
                    "USMALLINT",
                    "UTINYINT",
                ]
            )

            if is_numeric:
                try:
                    numeric_stats = self.con.execute(f"""
                        SELECT 
                            AVG("{col_name}")::DOUBLE as mean,
                            STDDEV("{col_name}")::DOUBLE as std,
                            MIN("{col_name}") as min_val,
                            MAX("{col_name}") as max_val,
                            MEDIAN("{col_name}")::DOUBLE as median,
                            QUANTILE_CONT("{col_name}", 0.25)::DOUBLE as q25,
                            QUANTILE_CONT("{col_name}", 0.75)::DOUBLE as q75
                        FROM {self.table_name}
                    """).fetchone()

                    stats.mean = numeric_stats[0]
                    stats.std = numeric_stats[1]
                    stats.min = numeric_stats[2]
                    stats.max = numeric_stats[3]
                    stats.median = numeric_stats[4]
                    stats.q25 = numeric_stats[5]
                    stats.q75 = numeric_stats[6]
                except Exception:
                    pass
            else:
                # Get top value for categorical/string columns
                try:
                    top_result = self.con.execute(f"""
                        SELECT "{col_name}", COUNT(*) as freq 
                        FROM {self.table_name} 
                        WHERE "{col_name}" IS NOT NULL
                        GROUP BY "{col_name}" 
                        ORDER BY freq DESC 
                        LIMIT 1
                    """).fetchone()

                    if top_result:
                        stats.top_value = str(top_result[0])
                        stats.top_frequency = top_result[1]

                    # Get min/max for date/time columns
                    if any(t in col_type for t in ["DATE", "TIME", "TIMESTAMP"]):
                        minmax = self.con.execute(f"""
                            SELECT MIN("{col_name}")::VARCHAR, MAX("{col_name}")::VARCHAR
                            FROM {self.table_name}
                        """).fetchone()
                        stats.min = minmax[0]
                        stats.max = minmax[1]
                except Exception:
                    pass

            column_stats.append(stats)

        return StatisticalSummary(columns=column_stats)

    def get_null_analysis(self) -> NullAnalysis:
        """Get null value analysis for the dataset."""
        schema = self.con.execute(f"DESCRIBE {self.table_name}").fetchall()
        row_count = self.con.execute(f"SELECT COUNT(*) FROM {self.table_name}").fetchone()[0]

        columns = []
        total_nulls = 0

        for row in schema:
            col_name = row[0]

            null_count = self.con.execute(
                f'SELECT COUNT(*) FROM {self.table_name} WHERE "{col_name}" IS NULL'
            ).fetchone()[0]

            null_pct = (null_count / row_count * 100) if row_count > 0 else 0
            total_nulls += null_count

            columns.append(
                NullColumn(
                    column_name=col_name,
                    null_count=null_count,
                    null_percentage=round(null_pct, 2),
                    non_null_count=row_count - null_count,
                )
            )

        total_cells = row_count * len(schema)
        total_null_pct = (total_nulls / total_cells * 100) if total_cells > 0 else 0

        return NullAnalysis(
            total_cells=total_cells,
            total_nulls=total_nulls,
            total_null_percentage=round(total_null_pct, 2),
            columns=columns,
        )

    async def analyze_stream(self) -> AsyncGenerator[str, None]:
        """Stream analysis results as Server-Sent Events."""
        try:
            self._setup_connection()

            # 1. Data Overview
            overview = self.get_overview()
            chunk = AnalysisChunk(type="overview", data=overview)
            yield f"data: {chunk.model_dump_json()}\n\n"

            # 2. Schema
            schema = self.get_schema()
            chunk = AnalysisChunk(type="schema", data=schema)
            yield f"data: {chunk.model_dump_json()}\n\n"

            # 3. Sample Data
            sample = self.get_sample_data(limit=10)
            chunk = AnalysisChunk(type="sample", data=sample)
            yield f"data: {chunk.model_dump_json()}\n\n"

            # 4. Statistical Summary
            stats = self.get_statistics()
            chunk = AnalysisChunk(type="statistics", data=stats)
            yield f"data: {chunk.model_dump_json()}\n\n"

            # 5. Null Analysis
            nulls = self.get_null_analysis()
            chunk = AnalysisChunk(type="nulls", data=nulls)
            yield f"data: {chunk.model_dump_json()}\n\n"

            # Complete
            chunk = AnalysisChunk(type="complete", message="Analysis complete")
            yield f"data: {chunk.model_dump_json()}\n\n"

        except Exception as e:
            chunk = AnalysisChunk(type="error", message=str(e))
            yield f"data: {chunk.model_dump_json()}\n\n"

        finally:
            self._close_connection()

