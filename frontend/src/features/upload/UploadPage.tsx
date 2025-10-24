// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Composes the upload flow shell, linking form interactions to workflow progression.
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { useWorkflow } from "../../contexts/WorkflowContext";
import { UploadForm } from "./components/UploadForm";
import { UploadInsights } from "./components/UploadInsights";
import { useUploadFlow } from "./hooks/useUploadFlow";

export const UploadPage = () => {
  const navigate = useNavigate();
  const { setCurrentStep, setLastQueueId, markStepComplete } = useWorkflow();

  const upload = useUploadFlow({
    onSuccess: (queueId) => {
      setLastQueueId(queueId);
      markStepComplete("upload");
      setCurrentStep("judges");
      navigate("/judges");
    },
  });

  return (
    <AppShell
      primary={
        <UploadForm
          jsonText={upload.jsonText}
          setJsonText={upload.setJsonText}
          summary={upload.summary}
          validation={upload.validation}
          status={upload.status}
          isLoading={upload.isLoading}
          onSubmit={upload.handleSubmit}
          onDrop={upload.handleFileDrop}
        />
      }
      sidebar={<UploadInsights summary={upload.summary} />}
    />
  );
};
