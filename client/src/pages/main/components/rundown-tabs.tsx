import React, { useState } from 'react';
import { Box, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '@mui/material/styles';

interface RundownTab {
    id: string;
    name: string;
}

interface RundownTabsProps {
    rundowns: RundownTab[];
    activeRundownId: string;
    onRundownSelect: (rundownId: string) => void;
    onRundownAdd: (name: string) => void;
}

const RundownTabs: React.FC<RundownTabsProps> = ({ 
    rundowns, 
    activeRundownId, 
    onRundownSelect, 
    onRundownAdd 
}) => {
    const theme = useTheme();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newRundownName, setNewRundownName] = useState('');

    const handleAddClick = () => {
        setAddDialogOpen(true);
        setNewRundownName('');
    };

    const handleAddDialogClose = () => {
        setAddDialogOpen(false);
        setNewRundownName('');
    };

    const handleAddConfirm = () => {
        if (newRundownName.trim()) {
            onRundownAdd(newRundownName.trim());
            setAddDialogOpen(false);
            setNewRundownName('');
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleAddConfirm();
        }
    };

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'end',
                    paddingTop: '4px',
                    paddingRight: '4px',
                    borderBottom: `2px solid ${theme.palette.divider}`,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    minHeight: '32px',
                    '&::-webkit-scrollbar': {
                        width: 0,
                        height: 0,
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'transparent',
                    },
                    // For Firefox
                    scrollbarWidth: 'none',
                    // For IE/Edge
                    msOverflowStyle: 'none',
                }}
            >
                {rundowns.map((rundown) => (
                    <Box
                        key={rundown.id}
                        onClick={() => onRundownSelect(rundown.id)}
                        sx={{
                            position: 'relative',
                            cursor: 'pointer',
                            minWidth: '60px',
                            height: '24px',
                            marginRight: '0px',
                            padding: '4px 12px',
                            backgroundColor: activeRundownId === rundown.id 
                                ? theme.palette.primary.main 
                                : theme.palette.background.paper,
                            color: activeRundownId === rundown.id 
                                ? theme.palette.primary.contrastText 
                                : theme.palette.text.secondary,
                            borderTopLeftRadius: '6px',
                            borderTopRightRadius: '6px',
                            border: `1px solid ${theme.palette.divider}`,
                            borderBottom: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6875rem', // Even smaller text
                            fontWeight: activeRundownId === rundown.id ? 500 : 400,
                            transition: 'all 0.2s ease',
                            // Physical tab effect
                            clipPath: activeRundownId === rundown.id 
                                ? 'polygon(6px 0%, calc(100% - 6px) 0%, 100% 100%, 0% 100%)'
                                : 'polygon(4px 0%, calc(100% - 4px) 0%, calc(100% - 2px) 100%, 2px 100%)',
                            '&:hover': {
                                backgroundColor: activeRundownId === rundown.id 
                                    ? theme.palette.primary.dark 
                                    : theme.palette.action.hover,
                            },
                            // Add shadow for depth
                            boxShadow: activeRundownId === rundown.id 
                                ? `0 -1px 2px rgba(0,0,0,0.1)` 
                                : `0 -0.5px 1px rgba(0,0,0,0.05)`,
                        }}
                    >
                        {rundown.name}
                        {/* Small notch for physical tab effect */}
                        {activeRundownId === rundown.id && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    backgroundColor: theme.palette.primary.main,
                                }}
                            />
                        )}
                    </Box>
                ))}
                
                {/* Add button */}
                <Box
                    sx={{
                        minWidth: '28px',
                        height: '24px',
                        marginLeft: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                    }}
                >
                    <IconButton
                        size="small"
                        onClick={handleAddClick}
                        sx={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: theme.palette.background.paper,
                            border: `1px dashed ${theme.palette.primary.main}`,
                            color: theme.palette.primary.main,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.light,
                                color: theme.palette.primary.contrastText,
                            },
                        }}
                    >
                        <AddIcon fontSize="inherit" />
                    </IconButton>
                </Box>
            </Box>

            {/* Add Rundown Dialog */}
            <Dialog open={addDialogOpen} onClose={handleAddDialogClose} maxWidth="xs" fullWidth>
                <DialogTitle>Add New Rundown</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Rundown Name"
                        fullWidth
                        variant="outlined"
                        value={newRundownName}
                        onChange={(e) => setNewRundownName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        error={rundowns.some(r => r.name.toLowerCase() === newRundownName.trim().toLowerCase())}
                        helperText={
                            rundowns.some(r => r.name.toLowerCase() === newRundownName.trim().toLowerCase()) 
                                ? "A rundown with this name already exists" 
                                : ""
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAddDialogClose}>Cancel</Button>
                    <Button 
                        onClick={handleAddConfirm} 
                        variant="contained"
                        disabled={!newRundownName.trim() || rundowns.some(r => r.name.toLowerCase() === newRundownName.trim().toLowerCase())}
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default RundownTabs;
