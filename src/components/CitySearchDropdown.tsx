"use client";
import React, { useState, useEffect, useRef } from 'react';
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
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [query]);

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
            <Combobox value={suggestions.find(city => city.full_name === query) ?? null} onChange={handleSelect}>
                <Combobox.Input
                    ref={inputRef}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    displayValue={(city: City | null) => city?.full_name ?? query}
                />
                {suggestions.length > 0 && (
                    <div 
                        style={{
                            position: 'fixed',
                            top: `${position.top}px`,
                            left: `${position.left}px`,
                            width: `${position.width}px`,
                            zIndex: 9999,
                        }}
                    >
                        <Combobox.Options className="w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {suggestions.map((city) => (
                                <Combobox.Option
                                    key={city.cityId}
                                    value={city}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 px-4 ${
                                            active ? 'text-white bg-blue-600' : 'text-gray-900'
                                        }`
                                    }
                                >
                                    {city.full_name}
                                </Combobox.Option>
                            ))}
                        </Combobox.Options>
                    </div>
                )}
            </Combobox>
        </div>
    );
};

export default CitySearchDropdown;
