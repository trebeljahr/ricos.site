import Layout from "@components/Layout";
import { FC, FormEvent, useState } from "react";
import { useEmergencyInfo } from "src/hooks/useEmergencyInfo";

const EmergencyInfoComponent: FC = () => {
  const [password, setPassword] = useState<string>("");
  const { emergencyInfo, error, loading, fetchEmergencyInfo, reset } =
    useEmergencyInfo();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetchEmergencyInfo(password);
  };

  return (
    <Layout
      title="Emergency Access"
      description="Emergency Access for getting important telephone numbers"
      url="/emergency"
      keywords={["emergency", "important numbers", "telephone numbers"]}
      image="/assets/blog/emergency.png"
      imageAlt="man being rescued by a helicopter"
    >
      <div className="max-w-md mx-auto p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold">Access Emergency Information</h2>
        {!emergencyInfo ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block font-medium">
                Enter Password:
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className={`w-full px-4 py-2 bg-myBlue-600  font-semibold rounded-md hover:bg-myBlue-700 transition-colors ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "Loading..." : "Submit"}
            </button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
        ) : (
          <div>
            <h3 className="text-xl font-semibold">Emergency Numbers</h3>
            <ul className="space-y-2 list-none">
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
              className="w-full px-4 py-2 bg-red-600  font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EmergencyInfoComponent;
