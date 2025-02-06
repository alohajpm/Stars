// src/components/CitySearchDropdown.tsx
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
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }
                const data = await response.json();
                setSuggestions(data.results || []);
            } catch (error) {
                console.error('Error fetching city suggestions:', error);
            }
        };

        const timerId = setTimeout(fetchSuggestions, 200);
        return () => clearTimeout(timerId);
    }, [query]);

     const handleSelect = (city: City | null) => { // Allow null selection
        if (!city) {
            onSelect({ name: "", stateCode: "", lat: 0, lng: 0 }); // Clear selection
            setQuery("");
            return;
        }
        const selectedCity = {
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        };

        setQuery(city.full_name); // Keep the input field updated
        onSelect(selectedCity);
    };
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
       if (e.target.value.length < 2) {
            setSuggestions([]);
            onSelect({ name: "", stateCode: "", lat: 0, lng: 0 }); // Clear selection
        }
    }

    return (
        // KEY CHANGE: Add a wrapper div with position: relative
        <div className="relative w-full">
            <Combobox value={suggestions.find(c => c.full_name === query) ?? null} onChange={handleSelect}>
                <Combobox.Input
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    autoComplete="off"
                    displayValue={(city: City | null) => city ? city.full_name : ""}
                />
                <Combobox.Options className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((city) => (
                        <Combobox.Option
                            key={city.cityId}
                            value={city}
                            className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                    active ? 'bg-blue-500 text-white' : 'text-gray-900'
                                }`
                            }
                        >
                            {({ selected, active }) => (
                                <>
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                        {city.full_name}
                                    </span>
                                    {selected && (
                                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'}`}>
                                            {/* Add a checkmark icon here if you want */}
                                        </span>
                                    )}
                                </>
                            )}
                        </Combobox.Option>
                    ))}
                </Combobox.Options>
            </Combobox>
        </div>
    );
};

export default CitySearchDropdown;
