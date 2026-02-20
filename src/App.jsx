import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DispatchForm from './pages/DispatchForm';
import DispatchDashboard from './pages/DispatchDashboard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<DispatchForm />} />
          <Route path="/tracking" element={<DispatchDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
