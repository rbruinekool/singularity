import React from 'react';
import { useTheme } from '@mui/material/styles';

const CircleMIcon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  const theme = useTheme();
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <circle cx={size/2} cy={size/2} r={size/2} fill={theme.palette.primary.main} />
      <text
        x="50%"
        y="58%"
        textAnchor="middle"
        fontSize={size * 0.6}
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fill={theme.palette.background.paper}
        dominantBaseline="middle"
      >
        M
      </text>
    </svg>
  );
};

export default CircleMIcon;
