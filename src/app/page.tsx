// /src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import CitySearchDropdown from '../components/CitySearchDropdown';

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
    const [selectedCity, setSelectedCity] = useState<{ name: string, stateCode: string, lat: number, lng: number } | null>(null);
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");
    const [chartImage, setChartImage] = useState<string | null>(null);

    useEffect(() => {
        // Clear selectedCity if birthDate or birthTime changes
        if (birthDate || birthTime) {
            setSelectedCity(null);
        }
    }, [birthDate, birthTime]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setLoading(true);
        setError("");
        setChartData(null);
        setChartImage(null);

        if (!birthDate) {
            setError("Birth Date is required.");
            setLoading(false);
            return;
        }
        if (!birthTime) {
            setError("Birth Time is required.");
            setLoading(false);
            return;
        }
        if (!selectedCity) {
            setError("Please select a valid place of birth.");
            setLoading(false);
            return;
        }

        const place = `${selectedCity.name}, ${selectedCity.stateCode}`;
        await fetchData(birthDate, birthTime, place); // Call fetchData directly
    };

     const fetchData = async (birthDate: string, birthTime: string, place: string) => {
        try {
            // 1. Calculate Positions
            const positionsRes = await fetch("/api/calculate-positions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ birthDate, birthTime, place }),
            });

            if (!positionsRes.ok) {
                const errorData = await positionsRes.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.details || "Failed to calculate positions";
                throw new Error(errorMessage);
            }

            const positionsData = await positionsRes.json();
            console.log("Received positions:", positionsData);

            // 2. Generate Interpretation
            const interpretationRes = await fetch("/api/generate-interpretation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ positions: positionsData }),
            });

            if (!interpretationRes.ok) {
                const errorData = await interpretationRes.json().catch(() => ({}));
                const errorMessage = errorData.error || errorData.details || "Failed to generate interpretation";
                throw new Error(errorMessage);
            }

            const interpretationData = await interpretationRes.json();
            interpretationData.calculated_positions = positionsData;
            console.log("Received interpretation:", interpretationData);
            setChartData(interpretationData);

            // 3. Generate Chart Image
            await handleGenerateChart(positionsData);

        } catch (error) {
            console.error("Error in fetchData:", error); // More specific error logging
            setError(error instanceof Error ? error.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    const handleGenerateChart = async (positions?: any) => {
        const positionsToUse = positions || chartData?.calculated_positions;

        if (!positionsToUse) {
            setError("No chart positions available");
            return;
        }
        console.log("Generating chart with positions:", positionsToUse);

        try {
            const res = await fetch("/api/generate-chart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ positions: positionsToUse }),
            });

            console.log("Chart API response status:", res.status);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("Chart API error:", errorData);
                const errorMessage = errorData.error || errorData.details || "Failed to generate chart image";
                throw new Error(errorMessage);
            }

            const data = await res.json();
            setChartImage(data.image);
            console.log("Chart image set.");

        } catch (error) {
            console.error("Error generating chart image:", error);
            setError(error instanceof Error ? error.message : "Failed to generate chart image");
        }
    };

     // Scoped styles for the ExpandableSection
    const expandableSectionStyles = {
        section: "mb-4 border rounded-lg overflow-hidden bg-white/95",
        header:
            "flex justify-between items-center p-4 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors",
        headerTitle: "subheading",
        headerIcon: "text-2xl text-blue-700",
        content: "p-4 bg-white",
        contentText: "body-text leading-relaxed",
    };

    const ExpandableSection = ({ title, content }: { title: React.ReactNode; content: string }) => {
        const [expanded, setExpanded] = useState(false);

        return (
            <div className={expandableSectionStyles.section}>
                <div
                    className={expandableSectionStyles.header}
                    onClick={() => setExpanded(!expanded)}
                >
                    <h3 className={expandableSectionStyles.headerTitle}>
                        {title}
                    </h3>
                    <span className={expandableSectionStyles.headerIcon}>
                        {expanded ? '−' : '+'}
                    </span>
                </div>
                {expanded && (
                    <div className={expandableSectionStyles.content}>
                        <p className={expandableSectionStyles.contentText}>
                            {content}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const AstrologyBackground = () => (
        <div className="fixed inset-0 z-[-1]">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-blue-900 to-black" />
            <div
                className="absolute inset-0 opacity-40 bg-cover bg-center"
                style={{
                    backgroundImage: "url('https://onlysnails.com/wp-content/uploads/2025/02/AdobeStock_794875557-scaled.jpeg')",
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
                        <h1 className="heading text-3xl text-center mb-6 text-blue-900">
                            Your Astrological Chart
                        </h1>
                        <p className="summary-text">
                            {chartData.summary}
                        </p>
                        <div className="space-y-4">
                            {Object.entries(chartData.details).map(([section, info]) => (
                                <ExpandableSection
                                    key={section}
                                    title={<span className={expandableSectionStyles.headerTitle}>{section}</span>}
                                    content={info}
                                />
                            ))}
                        </div>

                        {error && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}

                        {chartImage && (
                            <div className="mt-8">
                                <img
                                    src={chartImage}
                                    alt="Natal Chart"
                                    className="mx-auto max-w-full h-auto rounded-lg shadow-lg"
                                />
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setChartData(null);
                                setError("");
                                setChartImage(null);
                                setSelectedCity(null); // Clear the selected city
                                setBirthDate("");    // Clear
                                setBirthTime("");    // Clear

                            }}
                            className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto block"
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
                        <h1 className="heading text-3xl text-center mb-8 text-blue-900">
                            Discover Your Astrological Chart
                        </h1>
                        {error && (
                            <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label
                                    htmlFor="birthDate"
                                    className="block text-sm font-medium text-gray-700 subheading"
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
                                    className="block text-sm font-medium text-gray-700 subheading"
                                >
                                    Birth Time
                                </label>
                                <input
                                    type="time"
                                    id="birthTime"
                                    value={birthTime}
                                    onChange={(e) => setBirthTime(e.target.value)}
                                    required
                                    style={{ colorScheme: "light" }}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                />
                            </div>

                            <div className="space-y-2">
                                 <label htmlFor="place" className="block text-sm font-medium text-gray-700 subheading">
                                      Place of Birth
                                 </label>
                                 <CitySearchDropdown
                                    onSelect={setSelectedCity} // Correct
                                    placeholder="Enter City, State"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {loading ? (
                                    <>
                                        <span className="animate-spin mr-2">
                                            ⭐
                                        </span>
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
