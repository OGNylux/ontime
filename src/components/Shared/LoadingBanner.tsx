import { Box, Typography } from "@mui/material";

interface LoadingBannerProps {
  message?: string;
}

export default function LoadingBanner({ message = "Loading..." }: LoadingBannerProps) {
  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 2,
        borderRadius: 1,
      }}
    >
      <Typography color="text.secondary" variant="body2">
        {message}
      </Typography>
    </Box>
  );
}
