import { Box } from '@mui/material';

interface TreeConnectorProps {
  isLast?: boolean;
  isActive?: boolean;
  hasActiveBelow?: boolean;
}

export default function TreeConnector({ 
  isLast = false, 
  isActive = false, 
  hasActiveBelow = false 
}: TreeConnectorProps) {
  return (
    <Box
      position="relative"
      width={24}
      ml={1}
      mr={2}
      display="flex"
      alignItems="center"
      alignSelf="stretch"
    >
      {/* Upper vertical line */}
      <Box
        position="absolute"
        left={8}
        top={-6}
        height={isLast ? '50%' : '45%'}
        width={3}
        zIndex={2}
        bgcolor={hasActiveBelow || isActive ? 'primary.main' : 'text.secondary'}
      />
      {/* Lower vertical line */}
      {!isLast && (
        <Box
          position="absolute"
          left={8}
          top= '30%'
          bottom={-4}
          width={3}
          height='78%'
          zIndex={2}
          bgcolor={hasActiveBelow ? 'primary.main' : 'text.secondary'}
        />
      )}
      {/* Horizontal curved connector */}
      <Box
          position= 'absolute'
          left={8}
          top= '40%'
          width={12}
          height={12}
          borderLeft={3}
          borderBottom={3}
          zIndex={isActive && !hasActiveBelow ? 2 : 0}
          borderColor={isActive ? 'primary.main' : 'text.secondary'}
          sx={{transform: "translateY(-50%)", borderBottomLeftRadius: 8}}
      />
    </Box>
  );
}
