// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Configures client-side routing and wires feature pages under the workflow context.
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { WorkflowProvider } from "./contexts/WorkflowContext";
import { UploadPage } from "./features/upload/UploadPage";
import { JudgesPage } from "./features/judges/JudgesPage";
import { QueuePage } from "./features/queue/QueuePage";
import { ResultsPage } from "./features/results/ResultsPage";

function App() {
  return (
    <Router>
      <WorkflowProvider>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/judges" element={<JudgesPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </WorkflowProvider>
    </Router>
  );
}

export default App;
