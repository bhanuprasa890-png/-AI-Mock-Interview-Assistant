import { Route, Routes } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ResumeBanner } from './components/layout/ResumeBanner';
import { LandingPage } from './pages/LandingPage';
import { SetupPage } from './pages/SetupPage';
import { InterviewPage } from './pages/InterviewPage';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <ResumeBanner />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<HistoryDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
