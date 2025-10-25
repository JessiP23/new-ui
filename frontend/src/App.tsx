import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import JudgesPage from './pages/JudgesPage';
import QueuePage from './pages/QueuePage';
import ResultsPage from './pages/ResultsPage';
import { WorkflowProvider } from './contexts/WorkflowContext';

function App() {
  return (
    <Router>
      <WorkflowProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/judges" element={<JudgesPage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </Layout>
      </WorkflowProvider>
    </Router>
  );
}

export default App;
