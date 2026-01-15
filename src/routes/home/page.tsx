import { Box } from "@mui/material";
import LoadingBanner from "../../components/Loading/LoadingBanner";

function App() {

  return (
    <Box display="flex" flexDirection="column" height="100%" bgcolor="background.default" alignItems="center" justifyContent="center">
      <LoadingBanner message="Loading OnTime..." />
    </Box>
  );
}

export default App;
