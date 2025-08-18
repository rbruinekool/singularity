import React, { useMemo } from 'react';
import { useTable, useRowIds } from 'tinybase/ui-react';

interface FilteredSortedTableViewProps {
    tableId: string;
    cellId: string;
    filterRundownId: string;
    rowComponent: (props: { rowId: string; tableId: string }) => React.ReactElement;
}

const FilteredSortedTableView: React.FC<FilteredSortedTableViewProps> = ({ 
    tableId, 
    cellId, 
    filterRundownId, 
    rowComponent 
}) => {
    const table = useTable(tableId) || {};
    const allRowIds = useRowIds(tableId);
    
    // Filter rows by rundownId and sort by the specified cellId
    const filteredAndSortedRowIds = useMemo(() => {
        if (!allRowIds.length) return [];
        
        const filtered = allRowIds.filter(rowId => {
            const rundownIdForRow = table[rowId]?.rundownId;
            // Both should now be strings, so direct comparison
            return rundownIdForRow === filterRundownId;
        });
        
        return filtered.sort((a, b) => {
            const orderA = table[a]?.[cellId] ?? 0;
            const orderB = table[b]?.[cellId] ?? 0;
            if (typeof orderA !== 'number' || typeof orderB !== 'number') {
                return 0;
            }
            return orderA - orderB;
        });
    }, [table, allRowIds, cellId, filterRundownId]);
    
    return (
        <>
            {filteredAndSortedRowIds.map(rowId => 
                <React.Fragment key={rowId}>
                    {rowComponent({ rowId, tableId })}
                </React.Fragment>
            )}
        </>
    );
};

export default FilteredSortedTableView;
