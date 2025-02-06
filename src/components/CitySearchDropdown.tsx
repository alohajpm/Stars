// src/components/CitySearchDropdown.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';

interface City {
    name: string;
    stateCode: string;
    full_name: string;
    cityId: string; // Ensure cityId is present
    location: { latitude: number; longitude: number };
}

interface CitySearchDropdownProps {
    onSelect: (city: { name: string, stateCode: string, lat: number, lng: number }) => void;
    placeholder?: string;
    value?: string; // Add a value prop
}

const CitySearchDropdown: React.FC<CitySearchDropdownProps> = ({ onSelect, placeholder = "City, State", value }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    // No need for selectedValue state *inside* the dropdown

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
        // Update internal query state when the value prop changes (from parent)
        if (value && value !== query) {
          setQuery(value)
        }
    }, [value])


    useEffect(() => {
        const fetchSuggestions = async () => {
            if (query.length < 2) {
                setSuggestions([]);
                setIsOpen(false); // Close dropdown if query is too short
                return;
            }

            try {
                const response = await fetch(`/api/search-cities?query=${encodeURIComponent(query)}`);
                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }
                const data = await response.json();
                setSuggestions(data.results || []);
                setIsOpen(data.results && data.results.length > 0); // Only open if there are results
            } catch (error) {
                console.error('Error fetching city suggestions:', error);
            }
        };

        const timerId = setTimeout(fetchSuggestions, 200); // Debounce

        return () => clearTimeout(timerId);
    }, [query]);

    const handleSelect = (city: City) => {
        const selected = {
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        };
        setQuery(`${city.name}, ${city.stateCode}`); // Update the input field
        setSuggestions([]);
        setIsOpen(false);
        onSelect(selected); // Call the onSelect prop (THIS IS CRUCIAL)
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      if (e.target.value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        onSelect({name: "", stateCode: "", lat: 0, lng: 0});
      }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="text"
                value={query}  // Controlled component
                onChange={handleInputChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
            {isOpen && suggestions.length > 0 && (
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
