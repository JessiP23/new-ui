import { useState, useEffect } from 'react';
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
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) throw new Error('Must be array');
      const response = await axios.post(`${API_BASE}/upload`, parsed);
      setMessage(response.data.message);
      const queueId = parsed[0]?.queueId;
      if (queueId) {
        setLastQueueId(queueId);
        setCurrentStep('judges');
        navigate('/judges');
      }
    } catch (error: any) {
      setMessage('Upload failed: ' + error.message);
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