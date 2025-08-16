import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, InputAdornment, Grid } from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { useSetCellCallback, useCell } from 'tinybase/ui-react';
import { Model } from '../../../../../shared/singular/interfaces/singular-model';

interface TimeControlProps {
    model: Model;
    rundownId: string;
    rowId: string;
}

const TimeControl: React.FC<TimeControlProps> = ({ model, rundownId, rowId }) => {
    const [controlMode, setControlMode] = useState<'manual' | 'countdown' | 'startOnPlay'>('manual');
    const [manualTimeInput, setManualTimeInput] = useState('');
    const [countdownTimeInput, setCountdownTimeInput] = useState('');
    const [startOnPlayInput, setStartOnPlayInput] = useState('');
    const [inputError, setInputError] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now()); // For dynamic countdown

    // Get current value from TinyBase
    const currentValue = useCell(rundownId, rowId, model.id) as number | string | null;

    // Set cell callback for updating the timestamp or string value
    const setCellValue = useSetCellCallback(
        rundownId,
        rowId,
        model.id,
        (value: number | string) => value,
        []
    );

    // Initialize component state from stored value
    useEffect(() => {
        if (currentValue && typeof currentValue === 'number') {
            const date = new Date(currentValue);
            
            // Only populate manual time input if it's empty (don't override user clearing it)
            // For duration mode, we want to keep it clear after submission
            
            // Format as HH:MM for countdown input
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            setCountdownTimeInput(`${hours}:${minutes}`);
        }
    }, [currentValue]);

    // Dynamic countdown timer - updates every second
    useEffect(() => {
        let interval: number;
        
        if (typeof currentValue === 'number' && currentValue > Date.now()) {
            interval = window.setInterval(() => {
                setCurrentTime(Date.now());
            }, 1000);
        }
        
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [currentValue]);

    // Validate and parse manual time input as duration to add (HH:MM:SS or MM:SS)
    const parseManualTime = (input: string): number | null => {
        const timePattern = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})$/;
        const match = input.match(timePattern);
        
        if (!match) return null;
        
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        
        // Validate ranges (allow larger values for duration)
        if (minutes > 59 || seconds > 59) return null;
        
        // Calculate total milliseconds to add to current time
        const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        
        // Add duration to current time
        const now = new Date();
        const targetDate = new Date(now.getTime() + totalMs);
        
        return targetDate.getTime();
    };

    // Parse countdown time input (HH:MM)
    const parseCountdownTime = (input: string): number | null => {
        const timePattern = /^(\d{1,2}):(\d{2})$/;
        const match = input.match(timePattern);
        
        if (!match) return null;
        
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        
        // Validate ranges
        if (hours > 23 || minutes > 59) return null;
        
        // Create timestamp for today with specified time
        const now = new Date();
        const targetDate = new Date();
        targetDate.setHours(hours, minutes, 0, 0);
        
        // If the time is in the past today, set it for tomorrow
        if (targetDate <= now) {
            targetDate.setDate(targetDate.getDate() + 1);
        }
        
        return targetDate.getTime();
    };

    // Parse start-on-play duration (same as manual time but returns different format)
    const parseStartOnPlayTime = (input: string): number | null => {
        const timePattern = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})$/;
        const match = input.match(timePattern);
        
        if (!match) return null;
        
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        
        // Validate ranges (allow larger values for duration)
        if (minutes > 59 || seconds > 59) return null;
        
        // Calculate total milliseconds duration
        const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
        
        return totalMs;
    };

    // Handle manual time input
    const handleManualTimeSubmit = () => {
        const timestamp = parseManualTime(manualTimeInput);
        
        if (timestamp === null) {
            setInputError('Invalid duration format. Use HH:MM:SS or MM:SS');
            return;
        }
        
        setInputError('');
        setCellValue(timestamp);
        setManualTimeInput(''); // Clear the input after successful submission
    };

    // Handle countdown time selection
    const handleCountdownSubmit = () => {
        if (!countdownTimeInput) {
            setInputError('Please enter a countdown time');
            return;
        }
        
        const timestamp = parseCountdownTime(countdownTimeInput);
        
        if (timestamp === null) {
            setInputError('Invalid time format. Use HH:MM');
            return;
        }
        
        setInputError('');
        setCellValue(timestamp);
    };

    // Handle start-on-play time input
    const handleStartOnPlaySubmit = () => {
        if (!startOnPlayInput) {
            setInputError('Please enter a duration');
            return;
        }
        
        const durationMs = parseStartOnPlayTime(startOnPlayInput);
        
        if (durationMs === null) {
            setInputError('Invalid duration format. Use HH:MM:SS or MM:SS');
            return;
        }
        
        setInputError('');
        setCellValue(`::add-${durationMs}`);
        setStartOnPlayInput(''); // Clear the input after successful submission
    };

    // Generate hour options for quick selection
    const generateQuickHours = () => {
        const now = new Date();
        const options: React.ReactElement[] = [];
        
        for (let i = 1; i <= 12; i++) {
            const futureTime = new Date(now.getTime() + (i * 60 * 60 * 1000));
            const hours = futureTime.getHours().toString().padStart(2, '0');
            const minutes = futureTime.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            options.push(
                <Button
                    key={i}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                        setCountdownTimeInput(timeStr);
                        setInputError('');
                    }}
                    sx={{ mr: 0.5, mb: 0.5 }}
                >
                    +{i}h
                </Button>
            );
        }
        return options;
    };

    // Generate minute duration options for manual mode
    const generateQuickMinutes = () => {
        const durations = [1, 2, 5, 7, 10, 15, 20, 30, 45, 60];
        const options: React.ReactElement[] = [];
        
        for (const minutes of durations) {
            const timeStr = minutes < 60 
                ? `${minutes}:00`  // Format as MM:SS for minutes under 60
                : '1:00:00';      // Format as H:MM:SS for 60 minutes
            
            options.push(
                <Button
                    key={minutes}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                        const timestamp = parseManualTime(timeStr);
                        if (timestamp !== null) {
                            setCellValue(timestamp);
                            setInputError('');
                        }
                    }}
                    sx={{ mr: 0.5, mb: 0.5 }}
                >
                    {minutes}m
                </Button>
            );
        }
        return options;
    };

    // Generate minute duration options for start-on-play mode (reuse same logic)
    const generateStartOnPlayQuickMinutes = () => {
        const durations = [1, 2, 5, 7, 10, 15, 20, 30, 45, 60];
        const options: React.ReactElement[] = [];
        
        for (const minutes of durations) {
            const timeStr = minutes < 60 
                ? `${minutes}:00`  // Format as MM:SS for minutes under 60
                : '1:00:00';      // Format as H:MM:SS for 60 minutes
            
            options.push(
                <Button
                    key={minutes}
                    size="small"
                    variant="outlined"
                    onClick={() => {
                        const durationMs = parseStartOnPlayTime(timeStr);
                        if (durationMs !== null) {
                            setCellValue(`::add-${durationMs}`);
                            setInputError('');
                        }
                    }}
                    sx={{ mr: 0.5, mb: 0.5 }}
                >
                    {minutes}m
                </Button>
            );
        }
        return options;
    };

    // Format current timestamp for display
    const formatCurrentTime = (value: number | string | null): string => {
        if (!value) return 'No time set';
        
        // Handle string values (start-on-play format)
        if (typeof value === 'string') {
            if (value.startsWith('::add-')) {
                const durationMs = parseInt(value.substring(6), 10);
                const hours = Math.floor(durationMs / (1000 * 60 * 60));
                const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
                
                return `Start on play: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} duration`;
            }
            return 'Invalid format';
        }
        
        // Handle numeric timestamp
        const date = new Date(value);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        if (isToday) {
            return `Today at ${timeStr}`;
        } else if (isTomorrow) {
            return `Tomorrow at ${timeStr}`;
        } else {
            return `${date.toLocaleDateString()} at ${timeStr}`;
        }
    };

    // Calculate time remaining (uses dynamic currentTime for live countdown)
    const getTimeRemaining = (value: number | string | null): string => {
        if (!value) return '';
        
        // Handle string values (start-on-play format)
        if (typeof value === 'string') {
            if (value.startsWith('::add-')) {
                return 'Timer starts on play';
            }
            return '';
        }
        
        // Handle numeric timestamp
        const remaining = value - currentTime;
        
        if (remaining <= 0) return 'Time has passed';
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} remaining`;
    };

    return (
        <Grid size={{ md: 12, lg: 6 }}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {model.title}
                </Typography>
                
                {currentValue && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Target: {formatCurrentTime(currentValue)}
                        </Typography>
                        <Typography variant="body2" color="primary" sx={{ fontFamily: 'monospace' }}>
                            {getTimeRemaining(currentValue)}
                        </Typography>
                    </Box>
                )}
                
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                    <FormLabel component="legend">Input Mode</FormLabel>
                    <RadioGroup
                        row
                        value={controlMode}
                        onChange={(e) => setControlMode(e.target.value as 'manual' | 'countdown' | 'startOnPlay')}
                    >
                        <FormControlLabel value="startOnPlay" control={<Radio size="small" />} label="Start on Play" />
                        <FormControlLabel value="countdown" control={<Radio size="small" />} label="Clock Countdown" />
                        <FormControlLabel value="manual" control={<Radio size="small" />} label="Instant Countdown" />
                    </RadioGroup>
                </FormControl>
                
                {controlMode === 'startOnPlay' ? (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                            <TextField
                                label="Duration (HH:MM:SS or MM:SS)"
                                value={startOnPlayInput}
                                onChange={(e) => {
                                    setStartOnPlayInput(e.target.value);
                                    setInputError('');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleStartOnPlaySubmit();
                                    }
                                }}
                                size="small"
                                placeholder="30:00"
                                error={!!inputError}
                                helperText={inputError || 'Timer will start when asset plays'}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <AccessTime />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ flex: 1 }}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleStartOnPlaySubmit}
                            >
                                Set
                            </Button>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Quick select (minutes):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {generateStartOnPlayQuickMinutes()}
                            </Box>
                        </Box>
                    </Box>
                ) : controlMode === 'countdown' ? (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                            <TextField
                                label="Countdown to time (HH:MM)"
                                value={countdownTimeInput}
                                onChange={(e) => {
                                    setCountdownTimeInput(e.target.value);
                                    setInputError('');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCountdownSubmit();
                                    }
                                }}
                                size="small"
                                placeholder="14:30"
                                error={!!inputError}
                                helperText={inputError || 'Enter target time in HH:MM format'}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <AccessTime />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ flex: 1 }}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleCountdownSubmit}
                            >
                                Set
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                            <TextField
                                label="Duration (HH:MM:SS or MM:SS)"
                                value={manualTimeInput}
                                onChange={(e) => {
                                    setManualTimeInput(e.target.value);
                                    setInputError('');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleManualTimeSubmit();
                                    }
                                }}
                                size="small"
                                placeholder="30:00"
                                error={!!inputError}
                                helperText={inputError || 'Enter duration to add (e.g., 30:00 for 30 minutes)'}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <AccessTime />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ flex: 1 }}
                            />
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleManualTimeSubmit}
                      
                            >
                                Set
                            </Button>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Quick select (minutes):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {generateQuickMinutes()}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        </Grid>
    );
};

export default TimeControl;
