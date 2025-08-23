import React from 'react';

interface ManualTableProps {
    tableId: string;
}

const ManualTable: React.FC<ManualTableProps> = ({ tableId }: ManualTableProps) => {
    return (
        <div>
            <h2>ManualTable Placeholder</h2>
            <p>This is a placeholder for the ManualTable component.</p>
            <p>Card ID: {tableId}</p>
        </div>
    );
};

export default ManualTable;