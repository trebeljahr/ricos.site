// hooks/useEmergencyInfo.ts

import { useState } from "react";

interface EmergencyNumbers {
  mum: string;
  dad: string;
  marc: string;
}

interface EmergencyInfo {
  importantNumbers: EmergencyNumbers;
}

export const useEmergencyInfo = () => {
  const [emergencyInfo, setEmergencyInfo] = useState<EmergencyInfo | null>(
    null
  );
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const fetchEmergencyInfo = async (password: string) => {
    setLoading(true);
    setError("");
    setEmergencyInfo(null);

    try {
      const response = await fetch("/api/emergency", {
        method: "GET",
        headers: {
          "x-emergency-password": password,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "An unexpected error occurred.");
        setLoading(false);
        return;
      }

      const data: EmergencyInfo = await response.json();
      setEmergencyInfo(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch emergency information.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEmergencyInfo(null);
    setError("");
    setLoading(false);
  };

  return { emergencyInfo, error, loading, fetchEmergencyInfo, reset };
};
