// REFACTORED by GPT-5 — optimized for clarity and performance
// Purpose: Configures the Axios client and error handling utilities for backend communication.
import axios from "axios";
import type { ApiError } from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 25_000,
});

export const parseApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { detail?: string; message?: string })?.detail ??
      (error.response?.data as { message?: string })?.message ??
      error.message;
    return {
      status: error.response?.status,
      message,
      details: error.response?.data,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unexpected error",
    details: error,
  };
};

export const withRequest = async <T>(request: () => Promise<T>): Promise<T> => {
  try {
    return await request();
  } catch (error) {
    throw parseApiError(error);
  }
};
