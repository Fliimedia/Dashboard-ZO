import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

export default function DataTable({ columns, data, initialSort }) {
  const [sorting, setSorting] = useState(initialSort || []);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((h) => {
              const num = h.column.columnDef.meta && h.column.columnDef.meta.num;
              const sorted = h.column.getIsSorted();
              return (
                <th key={h.id} className={num ? "num" : ""} onClick={h.column.getToggleSortingHandler()}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {sorted && <span className="sortcue">{sorted === "asc" ? "\u2191" : "\u2193"}</span>}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => {
              const num = cell.column.columnDef.meta && cell.column.columnDef.meta.num;
              return (
                <td key={cell.id} className={num ? "num" : ""}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
