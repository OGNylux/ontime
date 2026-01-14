import { Box, Typography } from "@mui/material";
import LoadingIcon from "./LoadingIcon";

interface LoadingBannerProps {
  message?: string;
}

export default function LoadingBanner({ message = "Loading..." }: LoadingBannerProps) {
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        py: 2,
        borderRadius: 1,
      }}
    >
      <Box height={200} width={200}>
        <LoadingIcon />
      </Box>
      <Typography color="text.secondary" variant="body1">
        {message}
      </Typography>
    </Box>
  );
}
