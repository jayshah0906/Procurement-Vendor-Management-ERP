import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVendors } from '../../api/mockApi';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel,
  getSortedRowModel,
  flexRender 
} from '@tanstack/react-table';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TableSkeleton } from '../../components/feedback/Skeleton';
import { Funnel, Plus, CaretUp, CaretDown } from '@phosphor-icons/react';

export const VendorsPage = () => {
  const { data: vendors, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors });
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(() => [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Company Name', accessorKey: 'name' },
    { header: 'Category', accessorKey: 'category' },
    { header: 'GST Details', accessorKey: 'gst' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        const color = status === 'Active' ? 'blue' : status === 'Pending' ? 'yellow' : 'gray';
        return <Badge variant={color}>{status}</Badge>;
      }
    },
    {
      id: 'actions',
      header: '',
      cell: () => <button className="text-[var(--color-royal-blue)] hover:underline text-sm font-medium">Edit</button>
    }
  ], []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: vendors || [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <div className="flex gap-3">
          <Button variant="outline"><Funnel size={18} className="mr-2" /> Filter</Button>
          <Button variant="primary"><Plus size={18} className="mr-2" /> Add Vendor</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <CaretUp weight="bold" />,
                              desc: <CaretDown weight="bold" />
                            }[header.column.getIsSorted()] ?? null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 text-gray-700 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Showing Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.previousPage()} 
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.nextPage()} 
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
