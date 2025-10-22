import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Upload from './components/Upload';
import Judges from './components/Judges';
import Queue from './components/Queue';
import Results from './components/Results';
import { WorkflowProvider } from './contexts/WorkflowContext';

function App() {
  return (
    <Router>
      <WorkflowProvider>
        <Layout>
          <Routes>
            <Route path="/upload" element={<Upload />} />
            <Route path="/judges" element={<Judges />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/results" element={<Results />} />
            <Route path="/" element={<Upload />} />
          </Routes>
        </Layout>
      </WorkflowProvider>
    </Router>
  );
}

export default App;
