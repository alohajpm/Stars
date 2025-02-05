"use client";

import { useState } from "react";

interface ChartData {
  summary: string;
  details: Record<string, string>;
  calculated_positions?: {
    [key: string]: {
      sign: string;
      degree: number;
      minutes: number;
    };
  };
}

const HomePage = () => {
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [place, setPlace] = useState("");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [chartImage, setChartImage] = useState<string | null>(null); // State for the chart image

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('Submitting form with data:', { birthDate, birthTime, place });

      const res = await fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime, place }),
      });

      const data = await res.json();
      console.log('Received response:', data);

      if (!res.ok) {
        throw new Error(data.error || data.details || "Failed to fetch chart data");
      }

      setChartData(data);
    } catch (error) {
      console.error("Error fetching chart:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChart = async () => {
    if (!chartData || !chartData.calculated_positions) {
      setError("Please generate the chart data first.");
      return;
    }
  
    try {
      const res = await fetch("/api/generate-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: chartData.calculated_positions }),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || "Failed to generate chart image");
      }
  
      const data = await res.json();
      setChartImage(data.image);
    } catch (error) {
      console.error("Error generating chart image:", error);
      setError(error instanceof Error ? error.message : "An error occurred while generating the chart image");
    }
  };

  const ExpandableSection = ({ title, content }: { title: string; content: string }) => {
    const [expanded, setExpanded] = useState(false);

    return (
      <div className="mb-4 border rounded-lg overflow-hidden bg-white/95">
        <div
          className="flex justify-between items-center p-4 bg-purple-50 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
          <span className="text-2xl text-blue-700">{expanded ? "−" : "+"}</span>
        </div>
        {expanded && (
          <div className="p-4 bg-white">
            <p className="text-gray-700 leading-relaxed">{content}</p>
          </div>
        )}
      </div>
    );
  };

  const AstrologyBackground = () => (
    <div className="fixed inset-0 z-[-1]">
      <div className="absolute inset-0" />
      <div
        className="absolute inset-0 opacity-40 bg-cover bg-center"
        style={{
          backgroundImage: "url('https://onlysnails.com/wp-content/uploads/2025/02/nebula.jpg')",
          backgroundBlendMode: "screen",
        }}
      />
    </div>
  );

  if (chartData) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <AstrologyBackground />
        <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-lg">
          <div className="p-8">
            <h1 className="text-3xl font-serif text-center mb-6 text-blue-900">
              Your Astrological Chart
            </h1>
            <p className="text-xl text-center mb-8 text-gray-800 leading-relaxed">
              {chartData.summary}
            </p>
            <div className="space-y-4">
              {Object.entries(chartData.details).map(([section, info]) => (
                <ExpandableSection key={section} title={section} content={info} />
              ))}
            </div>
            <button
              onClick={handleGenerateChart}
              className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto block"
            >
              Generate Natal Chart
            </button>

            {/* Display the chart image if available */}
            {chartImage && (
              <div className="mt-8">
                <img src={chartImage} alt="Natal Chart" className="mx-auto" />
              </div>
            )}

            <button
              onClick={() => {
                setChartData(null);
                setError("");
                setChartImage(null); // Also reset the chart image
              }}
              className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto block"
            >
              ← Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <AstrologyBackground />
      <div className="max-w-xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-lg">
          <div className="p-8">
            <h1 className="text-3xl font-serif text-center mb-8 text-blue-900">
              Discover Your Astrological Chart
            </h1>
            {error && (
              <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-sm text-red-500 mt-2">
                    Developer: Check console for more details
                  </p>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Birth Date
                </label>
                <input
                  type="date"
                  id="birthDate"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="birthTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Birth Time
                </label>
                <input
                  type="time"
                  id="birthTime"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  required
                  style={{ colorScheme: 'light' }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="place"
                  className="block text-sm font-medium text-gray-700"
                >
                  Place of Birth
                </label>
                <input
                  type="text"
                  id="place"
                  placeholder="City, State"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⭐</span>
                    Creating Your Chart...
                  </>
                ) : (
                  "Get My Chart"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
