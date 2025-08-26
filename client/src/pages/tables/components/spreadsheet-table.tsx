import React, { useState, useRef } from 'react';
import { useTable, useStore } from 'tinybase/ui-react';
import { 
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    TextField, InputAdornment, Typography, Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import ReadOnlyTinyBaseCell from './readonly-tinybase-cell';

interface SpreadsheetTableProps {
    tableId: string;
}

const SpreadsheetTable: React.FC<SpreadsheetTableProps> = ({ tableId }) => {
    // Snackbar state for copy feedback
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
    const [copiedCellValue, setCopiedCellValue] = useState<string>('');

    // Copy to clipboard logic (from singular-info-dialog.tsx)
    const handleCopyCell = async (value: string) => {
        if (value !== undefined && value !== null) {
            try {
                await navigator.clipboard.writeText(value);
                setCopiedCellValue(value);
                setCopySnackbarOpen(true);
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = value;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    setCopiedCellValue(value);
                    setCopySnackbarOpen(true);
                } catch (fallbackErr) {
                    // Optionally handle error
                }
                document.body.removeChild(textArea);
            }
        }
    };
    const theme = useTheme();
    const store = useStore();
    
    // Get the actual TinyBase table ID using the pattern
    const getInternalTableId = () => {
        // Get the table name from DataTables
        const tableName = store?.getCell('DataTables', tableId, 'name');
        return tableName ? `$${tableName}$` : '';
    };
    
    const internalTableId = getInternalTableId();
    const table = useTable(internalTableId) || {};
    
    // Headers are stored in a special row '__headers__' in the table
    const headerRow = table['__headers__'] || {};
    const headerKeys = Object.keys(headerRow);
    
    // Search filter state
    const [searchFilter, setSearchFilter] = useState('');
    
    // Filtered data rows based on search
    const dataRowIds = Object.keys(table).filter(rowId => 
        rowId !== '__headers__' && 
        (searchFilter === '' || 
         Object.values(table[rowId] || {}).some(cellValue => 
            String(cellValue).toLowerCase().includes(searchFilter.toLowerCase())
         ))
    );

    // Check if the table is empty (no headers and no data)
    const isTableEmpty = headerKeys.length === 0 && dataRowIds.length === 0;

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Search bar */}
            <Box sx={{ display: 'flex', flexDirection: 'row', mb: 1 }}>
                    <TextField
                        size="small"
                        placeholder="Search table..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        sx={{
                            width: 200,
                            '& .MuiInputBase-input': {
                                fontSize: '0.75rem'
                            }
                        }}
                        variant="outlined"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: '1rem' }} />
                                </InputAdornment>
                            ),
                        }}
                    />
            </Box>
            <TableContainer component={Box} sx={{
                maxHeight: 400,
                overflow: 'auto',
                borderRadius: 1,
                '& .MuiTable-root': {
                    borderCollapse: 'separate',
                    borderSpacing: 0
                },
                '&::-webkit-scrollbar': {
                    width: '8px',
                    height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: theme.palette.background.default,
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.divider,
                    borderRadius: '4px',
                },
            }}>
                {isTableEmpty ? (
                    <Box sx={{ p: 3, textAlign: 'center', backgroundColor: theme.palette.background.paper }}>
                        <Typography variant="body1" color="text.secondary">
                            This table has no columns yet. Add data to your spreadsheet and refresh.
                        </Typography>
                    </Box>
                ) : (
                    <Table size="small" sx={{ tableLayout: 'fixed', width: 'max-content' }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                                {headerKeys.map((colKey) => (
                                    <TableCell
                                        key={colKey}
                                        sx={{
                                            fontWeight: theme.typography.fontWeightBold,
                                            backgroundColor: theme.palette.background.paper,
                                            borderRight: '1px solid rgba(200,200,200,0.1)',
                                            padding: '2px 4px',
                                            minWidth: '120px',
                                            maxWidth: '240px',
                                            height: '28px',
                                            boxSizing: 'border-box',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                            {headerRow[colKey]}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ backgroundColor: theme.palette.background.default }}>
                            {dataRowIds.map((rowId) => (
                                <TableRow
                                    key={rowId}
                                    sx={{
                                        minHeight: '20px',
                                        height: '20px',
                                        backgroundColor: 'inherit',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover
                                        },
                                        transition: 'background-color 0.2s',
                                    }}
                                >
                                    {headerKeys.map((colKey) => {
                                        const cellValue = table[rowId]?.[colKey] ?? '';
                                        return (
                                            <TableCell
                                                key={`${rowId}-${colKey}`}
                                                sx={{
                                                    padding: '1px 2px',
                                                    borderRight: '1px solid rgba(200,200,200,0.05)',
                                                    borderBottom: '1px solid rgba(109, 107, 107, 1)',
                                                    minHeight: '20px',
                                                    height: '20px',
                                                    minWidth: '120px',
                                                    maxWidth: '240px',
                                                    overflow: 'hidden',
                                                    boxSizing: 'border-box',
                                                    fontSize: '0.75rem',
                                                    cursor: cellValue ? 'pointer' : 'default',
                                                    transition: 'background-color 0.2s',
                                                    '&:hover': cellValue ? {
                                                        backgroundColor: theme.palette.action.selected,
                                                    } : {},
                                                }}
                                                onClick={() => cellValue && handleCopyCell(String(cellValue))}
                                                aria-label={cellValue ? `Copy cell value: ${cellValue}` : undefined}
                                            >
                                                <ReadOnlyTinyBaseCell
                                                    tableId={internalTableId}
                                                    rowId={rowId}
                                                    colKey={colKey}
                                                />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        {/* Snackbar for copy feedback */}
        <Snackbar
            open={copySnackbarOpen}
            autoHideDuration={2000}
            onClose={() => setCopySnackbarOpen(false)}
            message={copiedCellValue ? `Copied: ${copiedCellValue}` : 'Copied!'}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
    </Box>
    );
};

export default SpreadsheetTable;
