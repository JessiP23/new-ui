import { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const useUpload = (navigate: any, setCurrentStep: any, setLastQueueId: any) => {
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onDrop = (acceptedFiles: any) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      setJsonText(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleJsonSubmit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Input must be a JSON array of submissions.');
      if (parsed.length === 0) throw new Error('Array cannot be empty.');
      if (!parsed[0]?.queueId) throw new Error('First submission must have a queueId to determine the queue.');
      const response = await axios.post(`${API_BASE}/upload`, parsed);
      setMessage(response.data.message);
      const queueId = parsed[0].queueId;
      setLastQueueId(queueId);
      setCurrentStep('judges');
      navigate('/judges');
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'An unexpected error occurred.';
      setMessage(`Upload failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    jsonText,
    setJsonText,
    message,
    loading,
    onDrop,
    handleJsonSubmit,
  };
};
