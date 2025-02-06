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
    const [isOpen, setIsOpen] = useState(false);

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
                setIsOpen(true);
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
        const selectedCity = {
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        };

        setQuery(city.full_name);
        onSelect(selectedCity);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (e.target.value.length < 2) {
            setSuggestions([]);
            onSelect({ name: "", stateCode: "", lat: 0, lng: 0 });
            setIsOpen(false);
        } else {
            setIsOpen(true);
        }
    };

    return (
        <div className="relative w-full">
            <Combobox value={suggestions.find(city => city.full_name === query) ?? null} onChange={handleSelect}>
                <div className="relative">
                    <Combobox.Input
                        onChange={handleInputChange}
                        placeholder={placeholder}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                        autoComplete="off"
                        displayValue={(city: City | null) => city ? city.full_name : query}
                    />
                </div>
                
                {isOpen && suggestions.length > 0 && (
                    <Combobox.Options className="absolute z-[100] w-full mt-1 bg-white border-2 border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {suggestions.map((city) => (
                            <Combobox.Option
                                key={city.cityId}
                                value={city}
                                className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                                        active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                    }`
                                }
                            >
                                {({ selected, active }) => (
                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                        {city.full_name}
                                    </span>
                                )}
                            </Combobox.Option>
                        ))}
                    </Combobox.Options>
                )}
            </Combobox>
        </div>
    );
};

export default CitySearchDropdown;
