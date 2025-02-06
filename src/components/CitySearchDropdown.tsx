"use client";
import React, { useState, useEffect } from 'react';

interface City {
    name: string;
    stateCode: string;
    full_name: string;
    cityId: string;
    location: { latitude: number; longitude: number };
}

interface Props {
    onSelect: (city: { name: string, stateCode: string, lat: number, lng: number }) => void;
    placeholder?: string;
}

export default function CitySearchDropdown({ onSelect, placeholder = "City, State" }: Props) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const fetchCities = async () => {
            try {
                const response = await fetch(`/api/search-cities?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                setSuggestions(data.results || []);
            } catch (error) {
                console.error('Error fetching cities:', error);
                setSuggestions([]);
            }
        };

        const timer = setTimeout(fetchCities, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return (
        <>
            <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="relative">
                <div className="absolute left-0 right-0 mt-1">
                    {suggestions.length > 0 && (
                        <ul className="bg-white border-2 border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {suggestions.map((city) => (
                                <li
                                    key={city.cityId}
                                    className="px-4 py-2 hover:bg-blue-500 hover:text-white cursor-pointer"
                                    onClick={() => {
                                        onSelect({
                                            name: city.name,
                                            stateCode: city.stateCode,
                                            lat: city.location.latitude,
                                            lng: city.location.longitude
                                        });
                                        setQuery(city.full_name);
                                        setSuggestions([]);
                                    }}
                                >
                                    {city.full_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );
}
