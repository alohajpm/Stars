// src/components/CitySearchDropdown.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';

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
    initialValue?: string; // Changed from 'value' to 'initialValue'
}

const CitySearchDropdown: React.FC<CitySearchDropdownProps> = ({ onSelect, placeholder = "City, State", initialValue = "" }) => {
    const [query, setQuery] = useState(initialValue); // Initialize with initialValue
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }, []);


    // Fetch suggestions (debounced)
    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.length < 2) {
                setSuggestions([]);
                setIsOpen(false);
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


    // Handle city selection
    const handleSelect = (city: City) => {
      const selectedCity = {
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        };

        setQuery(`${city.name}, ${city.stateCode}`);
        setSuggestions([]);
        setIsOpen(false);
        onSelect(selectedCity); // Pass to parent
    };

    // Handle input change
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        setQuery(inputValue); // Directly update query state

        if (inputValue.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
             onSelect({name: "", stateCode: "", lat: 0, lng: 0}); //clears onSelect if less than 2 characters
        }
    };


    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="text"
                value={query} // Controlled input
                onChange={handleInputChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                 onFocus={() => setIsOpen(query.length >= 2 && suggestions.length > 0)} //open on Focus if valid

            />
            {isOpen && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {suggestions.map((city) => (
                        <li
                            key={city.cityId}
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
