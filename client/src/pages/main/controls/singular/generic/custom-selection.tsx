import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Typography, IconButton, Grid
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useRowIds, useStore, useTable, useCell } from 'tinybase/ui-react';
import { Model } from '../../../../../shared/singular/interfaces/singular-model';
import { usePayloadValue } from '../hooks/usePayload';

// Import our newly extracted components
import ManualTextInput from './ManualTextInput';
import DefaultSelection from './DefaultSelection';
import TableSelectionInput from './TableSelectionInput';
import InputMethodSelector from './InputMethodSelector';

interface CustomSelectionProps {
    model: Model;
    rowId: string;
}

interface TableSelection {
    tableId: string;
    tableName: string;
    columns: string[];
}

// Define the possible input modes
type InputMode = 'manual' | 'default' | 'table';

const CustomSelection: React.FC<CustomSelectionProps> = ({ model, rowId }) => {
    const store = useStore();
    const rundownId = 'rundown-1';

    // State for dialog
    const [inputMethodDialogOpen, setInputMethodDialogOpen] = useState(false);

    // Track if this is the initial mount to prevent unnecessary updates
    const isInitialMount = useRef(true);

    // Get the current selected value from the payload
    const currentValue = usePayloadValue(rundownId, rowId, model.id, model.defaultValue || '');

    // Store configuration directly in the rundown row, not in the payload
    const configTableId = useCell(rundownId, rowId, `${model.id}_tableId`) as string | undefined;
    const configColumnName = useCell(rundownId, rowId, `${model.id}_columnName`) as string | undefined;

    // State for the UI - initialize from the TinyBase cells but manage locally to prevent loops
    const [selectedTable, setSelectedTable] = useState<string | null>(() => configTableId || null);
    const [selectedColumn, setSelectedColumn] = useState<string | null>(() => configColumnName || null);

    // Determine the default input mode based on model.type
    const defaultMode = model.type === 'text' ? 'manual' : 'default';

    // Get or set the input mode from TinyBase
    const storedInputMode = useCell(rundownId, rowId, `${model.id}_inputMode`) as InputMode;
    const [inputMode, setInputMode] = useState<InputMode>(storedInputMode || defaultMode);

    // Track whether we need to update TinyBase to prevent loops
    const skipNextUpdate = useRef(false);

    // Get the list of available tables from DataTables
    const dataTablesRowIds = useRowIds('DataTables') || [];
    const dataTables = useTable('DataTables') || {};

    // Create a list of available tables
    const availableTables: TableSelection[] = useMemo(() => {
        return dataTablesRowIds.map(id => {
            const tableName = dataTables[id]?.name as string;
            const internalTableId = tableName ? `$${tableName}$` : '';

            // Get columns if the table exists
            const tableData = store?.getTable(internalTableId);
            const firstRowId = tableData ? Object.keys(tableData)[0] : null;
            const columns = firstRowId && tableData ? Object.keys(tableData.__headers__ || {}) : [];

            return {
                tableId: id,
                tableName: tableName || 'Unnamed Table',
                columns
            };
        });
    }, [dataTablesRowIds, dataTables, store]);

    // When the component mounts, ensure initial state is properly initialized
    useEffect(() => {
        // Only execute this on the initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;

            // Make sure local state matches TinyBase state on mount
            if (configTableId) {
                setSelectedTable(configTableId);
            }

            if (configColumnName) {
                setSelectedColumn(configColumnName);
            }

            // Initialize the input mode in TinyBase if it's not already set
            if (!storedInputMode) {
                store?.setCell(rundownId, rowId, `${model.id}_inputMode`, defaultMode);
            }
        }
    }, [configTableId, configColumnName, defaultMode, model.id, rowId, rundownId, store, storedInputMode]);

    // Additional state for table config in the dialog
    const [showTableConfig, setShowTableConfig] = useState(false);
    const [tempTableId, setTempTableId] = useState<string | null>(selectedTable);
    const [tempColumnName, setTempColumnName] = useState<string | null>(selectedColumn);
    const [tempTableColumns, setTempTableColumns] = useState<string[]>([]);

    // Get the options for the dropdown based on the selected table and column
    const options = useMemo(() => {
        if (!selectedTable || !selectedColumn) {
            return [];
        }

        const tableName = dataTables[selectedTable]?.name as string;
        if (!tableName) return [];

        const internalTableId = `$${tableName}$`;
        const tableData = store?.getTable(internalTableId);
        if (!tableData) return [];

        // Extract unique values from the selected column in the table
        const uniqueValues = new Set<string>();
        Object.values(tableData).forEach(row => {
            const value = row[selectedColumn as string];
            if (value !== undefined && value !== null) {
                uniqueValues.add(String(value));
            }
        });

        return Array.from(uniqueValues).sort();
    }, [selectedTable, selectedColumn, dataTables, store]);

    // When table or column selection changes, update the configuration
    const handleConfigChange = (tableId: string | null, columnName: string | null) => {
        if (tableId !== selectedTable || columnName !== selectedColumn) {
            // Set our flag to skip the next update from TinyBase changes
            skipNextUpdate.current = true;

            // Update local state first
            setSelectedTable(tableId);
            setSelectedColumn(columnName);

            // Then update TinyBase
            if (tableId) {
                store?.setCell(rundownId, rowId, `${model.id}_tableId`, tableId);
            } else {
                store?.delCell(rundownId, rowId, `${model.id}_tableId`);
            }

            if (columnName) {
                store?.setCell(rundownId, rowId, `${model.id}_columnName`, columnName);
            } else {
                store?.delCell(rundownId, rowId, `${model.id}_columnName`);
            }
        }
    };

    // Store the input mode when it changes
    const handleInputModeChange = (newMode: InputMode) => {
        setInputMode(newMode);

        // If table mode is selected, don't close the dialog and show table config instead
        if (newMode === 'table') {
            // Set state for table configuration within the same dialog
            setShowTableConfig(true);
        } else {
            // For other modes, just close the dialog
            store?.setCell(rundownId, rowId, `${model.id}_inputMode`, newMode);
            setInputMethodDialogOpen(false);
            setShowTableConfig(false);
        }
    };

    // Handle saving table configuration and closing dialog
    const handleSaveTableConfig = () => {
        handleConfigChange(tempTableId, tempColumnName);
        store?.setCell(rundownId, rowId, `${model.id}_inputMode`, 'table');
        setInputMethodDialogOpen(false);
        setShowTableConfig(false);
    };

    // Handle table configuration button click
    const handleConfigureTable = () => {
        // Reset temp values to current values
        setTempTableId(selectedTable);
        setTempColumnName(selectedColumn);
        setShowTableConfig(true);
        setInputMethodDialogOpen(true);
    };

    return (
        <Grid size={{ md: 12, lg: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                    {model.title || model.id}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                        size="small"
                        onClick={() => setInputMethodDialogOpen(true)}
                        sx={{ ml: 1 }}
                    >
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', width: '100%' }}>
                {inputMode === 'manual' && (
                    <ManualTextInput
                        rundownId={rundownId}
                        rowId={rowId}
                        modelId={model.id}
                        currentValue={currentValue}
                    />
                )}

                {inputMode === 'default' && (
                    <DefaultSelection
                        rundownId={rundownId}
                        rowId={rowId}
                        modelId={model.id}
                        currentValue={currentValue}
                        selections={model.selections || []}
                    />
                )}

                {inputMode === 'table' && (
                    <TableSelectionInput
                        rundownId={rundownId}
                        rowId={rowId}
                        modelId={model.id}
                        currentValue={currentValue}
                        selectedTable={selectedTable}
                        selectedColumn={selectedColumn}
                        options={options}
                        onConfigure={handleConfigureTable}
                    />
                )}
            </Box>

            {/* Input Method Selector Dialog */}
            <InputMethodSelector
                inputMethodDialogOpen={inputMethodDialogOpen}
                setInputMethodDialogOpen={setInputMethodDialogOpen}
                inputMode={inputMode}
                modelType={model.type}
                handleInputModeChange={handleInputModeChange}
                showTableConfig={showTableConfig}
                setShowTableConfig={setShowTableConfig}
                tempTableId={tempTableId}
                setTempTableId={setTempTableId}
                tempColumnName={tempColumnName}
                setTempColumnName={setTempColumnName}
                tempTableColumns={tempTableColumns}
                setTempTableColumns={setTempTableColumns}
                availableTables={availableTables}
                handleSaveTableConfig={handleSaveTableConfig}
            />
        </Grid>
    );
};

export default CustomSelection;
