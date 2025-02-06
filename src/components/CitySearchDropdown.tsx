"use client";
import React, { useState, useEffect } from 'react';
import { Combobox } from '@headlessui/react';

interface City {
    name: string;
    stateCode: string;
    full_name: string;
    cityId: string;
    location: { latitude: number; longitude: number };
}

interface CitySearchDropdownProps {
    onSelect: (city: { name: string, stateCode: string, lat: number, lng: number }) => void;
    placeholder?: string;
}

const CitySearchDropdown: React.FC<CitySearchDropdownProps> = ({ onSelect, placeholder = "City, State" }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                const response = await fetch(`/api/search-cities?query=${encodeURIComponent(query)}`);
                if (!response.ok) throw new Error(`API request failed: ${response.status}`);
                const data = await response.json();
                setSuggestions(data.results || []);
            } catch (error) {
                console.error('Error fetching city suggestions:', error);
            }
        };

        const timerId = setTimeout(fetchSuggestions, 200);
        return () => clearTimeout(timerId);
    }, [query]);

    const handleSelect = (city: City | null) => {
        if (!city) {
            onSelect({ name: "", stateCode: "", lat: 0, lng: 0 });
            setQuery("");
            return;
        }
        onSelect({
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        });
        setQuery(city.full_name);
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Combobox value={suggestions.find(city => city.full_name === query) ?? null} onChange={handleSelect}>
                    <div className="relative">
                        <Combobox.Input
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                            displayValue={(city: City | null) => city?.full_name ?? query}
                        />
                        <div className="fixed inset-0 z-40" style={{ pointerEvents: suggestions.length > 0 ? 'auto' : 'none', background: 'transparent' }} />
                        <div className="absolute w-full z-50">
                            <Combobox.Options className="absolute w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {suggestions.map((city) => (
                                    <Combobox.Option
                                        key={city.cityId}
                                        value={city}
                                        className={({ active }) =>
                                            `cursor-default select-none relative py-2 pl-3 pr-9 ${
                                                active ? 'text-white bg-blue-600' : 'text-gray-900'
                                            }`
                                        }
                                    >
                                        {city.full_name}
                                    </Combobox.Option>
                                ))}
                                {query.length >= 2 && suggestions.length === 0 && (
                                    <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-700">
                                        No cities found.
                                    </div>
                                )}
                            </Combobox.Options>
                        </div>
                    </div>
                </Combobox>
            </div>
        </div>
    );
};

export default CitySearchDropdown;
