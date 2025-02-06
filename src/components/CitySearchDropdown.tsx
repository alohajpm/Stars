// src/components/CitySearchDropdown.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';

interface City {
    name: string;
    stateCode: string;
    full_name: string;
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
    const [selectedValue, setSelectedValue] = useState<{ name: string; stateCode: string; lat: number; lng:number } | null>(null);


    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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

        const timerId = setTimeout(fetchSuggestions, 200); // Debounce

        return () => clearTimeout(timerId); // Cleanup on query change or unmount
    }, [query]);


    const handleSelect = (city: City) => {
        const selected = {
          name: city.name,
          stateCode: city.stateCode,
          lat: city.location.latitude,
          lng: city.location.longitude
        }
        setSelectedValue(selected);
        setQuery(`${city.name}, ${city.stateCode}`);
        setSuggestions([]);
        setIsOpen(false);
        onSelect(selected); // Notify parent component
    };


    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setIsOpen(true); //open when typing
                    setSelectedValue(null); //clear selection

                }}
                placeholder={placeholder}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            {isOpen && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {suggestions.map((city) => (
                        <li
                            key={city.id}
                            onClick={() => handleSelect(city)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                        >
                            {city.full_name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CitySearchDropdown;
