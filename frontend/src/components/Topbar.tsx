import { useWorkflow } from "../contexts/WorkflowContext";
import { Link } from 'react-router-dom';

export default function Topbar() {
  const { currentStep, setCurrentStep } = useWorkflow();

  const steps = [
    { key: 'upload', label: 'Upload', path: '/upload' },
    { key: 'judges', label: 'Judges', path: '/judges' },
    { key: 'queue', label: 'Queue', path: '/queue' },
    { key: 'results', label: 'Results', path: '/results' },
  ];

  const currentIndex = steps.findIndex(s => s.key === currentStep);

  const handleLinkClick = (step: typeof currentStep) => {
    setCurrentStep(step);
  };

  return (
    <header className="w-full py-4 flex flex-col justify-center px-4 bg-white/2 backdrop-blur-sm border-b border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold text-indigo-600">AI Judge</div>
        <div className="text-sm text-gray-400">Fast, simple evaluations</div>
      </div>
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center">
            <Link
              to={step.path}
              onClick={() => handleLinkClick(step.key as typeof currentStep)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                index <= currentIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {step.label}
            </Link>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 ${index < currentIndex ? 'bg-indigo-600' : 'bg-gray-600'}`} />
            )}
          </div>
        ))}
      </div>
    </header>
  );
}