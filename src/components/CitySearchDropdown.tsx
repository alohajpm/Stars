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
    const [selectedValue, setSelectedValue] = useState<City | null>(null); // Track selected value

    useEffect(() => {
        const fetchSuggestions = async () => {
            // API call only if query length is 2 or more.
            if (query.length < 2) {
                setSuggestions([]); // Clear suggestions
                return; // Exit early
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
        const timerId = setTimeout(fetchSuggestions, 200); // Debounce

        return () => {
            clearTimeout(timerId);
        }


    }, [query]); // Depend on query


    const handleSelect = (city: City | null) => {
       if (city) {
        // If a city is selected from the dropdown:
        setSelectedValue(city); // Update selectedValue
        setQuery(city.full_name); // Update the query to the full name
        onSelect({  //call the onSelect
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        });

    } else {
        // If no city is selected (e.g., cleared, or no match):
        setSelectedValue(null); // Clear selectedValue
        onSelect({ name: "", stateCode: "", lat: 0, lng: 0 }); //call onSelect
    }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value); //always update query
        if (e.target.value.length < 2) {
            setSuggestions([]);
            setSelectedValue(null);
            onSelect({ name: "", stateCode: "", lat: 0, lng: 0 }); // Clear selection
        }
    }


    return (
        <div className="relative w-full">
            <Combobox value={selectedValue} onChange={handleSelect}>
                <Combobox.Input
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    displayValue={(city: City | null) => city ? city.full_name : query} // Use query
                    autoComplete="off"
                />
                <Combobox.Options
                    className="absolute left-0 z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
                      style={{
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e5e7eb'
                    }}
                >
                    {suggestions.length === 0 && query.length >= 2 && (
                         <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                         No cities found.
                     </div>
                    )}
                    {suggestions.map((city) => (
                        <Combobox.Option
                            key={city.cityId}
                            value={city}
                            className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-3 pr-9 ${
                                    active ? 'bg-blue-600 text-white' : 'text-gray-900'
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
