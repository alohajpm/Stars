"use client";
import React, { useState, useEffect } from 'react';
import { Listbox } from '@headlessui/react';

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
    const [selectedCity, setSelectedCity] = useState<City | null>(null);
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

    const handleSelect = (city: City) => {
        setSelectedCity(city);
        onSelect({
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        });
        setQuery(city.full_name);
    };

    return (
        <div className="relative">
            <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            {suggestions.length > 0 && (
                <div className="absolute mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto z-50 border border-gray-200">
                    {suggestions.map((city) => (
                        <div
                            key={city.cityId}
                            className="px-4 py-2 hover:bg-blue-500 hover:text-white cursor-pointer"
                            onClick={() => handleSelect(city)}
                        >
                            {city.full_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
