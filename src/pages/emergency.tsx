import React, { useState } from "react";
import { useEmergencyInfo } from "src/hooks/useEmergencyInfo";

const EmergencyInfoComponent: React.FC = () => {
  const [password, setPassword] = useState<string>("");
  const { emergencyInfo, error, loading, fetchEmergencyInfo, reset } =
    useEmergencyInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchEmergencyInfo(password);
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Access Emergency Information
      </h2>
      {!emergencyInfo ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-gray-700 font-medium mb-2"
            >
              Enter Password:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className={`w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Loading..." : "Submit"}
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
      ) : (
        <div>
          <h3 className="text-xl font-semibold mb-4">Emergency Numbers</h3>
          <ul className="space-y-2 mb-6">
            <li className="flex justify-between">
              <span className="font-medium">Mum:</span>
              <span>{emergencyInfo.importantNumbers.mum}</span>
            </li>
            <li className="flex justify-between">
              <span className="font-medium">Dad:</span>
              <span>{emergencyInfo.importantNumbers.dad}</span>
            </li>
            <li className="flex justify-between">
              <span className="font-medium">Marc:</span>
              <span>{emergencyInfo.importantNumbers.marc}</span>
            </li>
          </ul>
          <button
            onClick={() => {
              reset();
              setPassword("");
            }}
            className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default EmergencyInfoComponent;
