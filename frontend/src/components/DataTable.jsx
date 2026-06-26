function formatCellValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function getRowKey(row, index) {
  return (
    row.productId ||
    row.exerciseId ||
    row.evaluationId ||
    row.specialistId ||
    row.planId ||
    row.id ||
    index
  );
}

function DataTable({ columns, rows, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return <div className="empty-state">{emptyMessage || "No records found."}</div>;
  }

  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : formatCellValue(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
