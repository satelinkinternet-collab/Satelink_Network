import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyField: keyof T;
}

export function DataTable<T>({ data, columns, keyField }: DataTableProps<T>) {
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                No data available
            </div>
        );
    }

    return (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                        {columns.map((col, idx) => (
                            <TableHead key={idx} className="text-zinc-400 font-medium">
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <TableRow key={String(row[keyField])} className="border-zinc-800 hover:bg-zinc-800/50">
                            {columns.map((col, idx) => (
                                <TableCell key={idx} className="text-zinc-300">
                                    {col.cell ? col.cell(row) : String(row[col.accessorKey as keyof T])}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
