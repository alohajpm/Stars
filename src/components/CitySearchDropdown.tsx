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
        const selectedCity = { //Destructure Correctly
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        };
        setQuery(city.full_name);
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
        <div className="relative w-full">
            <Combobox value={suggestions.find(city => city.full_name === query) ?? null} onChange={handleSelect}>
                <Combobox.Input
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    displayValue={(city: City | null) => city?.full_name ?? ""}  {/*CRITICAL: Use optional chaining*/}
                    autoComplete="off"
                />
                <Combobox.Options
                    className="absolute left-0 z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
                      style={{
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb'
                    }}
                >
                    {suggestions.map((city) => (
                        <Combobox.Option
                            key={city.cityId} //Correct Key
                            value={city}
                            className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                            }
                        >
                            {city.full_name}
                        </Combobox.Option>
                    ))}
                    {query.length >= 2 && suggestions.length === 0 && (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            No cities found.
                        </div>
                    )}
                </Combobox.Options>
            </Combobox>
        </div>
    );
};

export default CitySearchDropdown;
