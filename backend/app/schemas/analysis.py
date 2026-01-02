"""Pydantic schemas for data analysis results."""

from typing import Any, Literal

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    """Information about a single column."""

    name: str
    dtype: str
    nullable: bool = True


class DataOverview(BaseModel):
    """High-level overview of the dataset."""

    row_count: int
    column_count: int
    file_name: str
    file_size_bytes: int
    file_type: str


class SchemaInfo(BaseModel):
    """Schema information for the dataset."""

    columns: list[ColumnInfo]


class SampleData(BaseModel):
    """Sample rows from the dataset."""

    columns: list[str]
    rows: list[list[Any]]


class ColumnStatistics(BaseModel):
    """Statistical summary for a single column."""

    column_name: str
    dtype: str
    count: int
    unique_count: int | None = None
    # Numeric statistics
    mean: float | None = None
    std: float | None = None
    min: float | str | None = None
    max: float | str | None = None
    median: float | None = None
    q25: float | None = None
    q75: float | None = None
    # String/categorical statistics
    top_value: str | None = None
    top_frequency: int | None = None


class StatisticalSummary(BaseModel):
    """Statistical summary for the entire dataset."""

    columns: list[ColumnStatistics]


class NullColumn(BaseModel):
    """Null analysis for a single column."""

    column_name: str
    null_count: int
    null_percentage: float
    non_null_count: int


class NullAnalysis(BaseModel):
    """Null value analysis for the dataset."""

    total_cells: int
    total_nulls: int
    total_null_percentage: float
    columns: list[NullColumn]


class AnalysisChunk(BaseModel):
    """A single chunk of streaming analysis results."""

    type: Literal["overview", "schema", "sample", "statistics", "nulls", "complete", "error"]
    data: DataOverview | SchemaInfo | SampleData | StatisticalSummary | NullAnalysis | dict | None = None
    message: str | None = None


class AnalyzeRequest(BaseModel):
    """Request model for analyzing a data file."""

    file_path: str

