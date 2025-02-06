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
    value?: string;
}

const CitySearchDropdown: React.FC<CitySearchDropdownProps> = ({ onSelect, placeholder = "City, State", value }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<City[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                console.log("CitySearchDropdown: Clicked outside, closing dropdown"); // LOG 1
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
            console.log("dropdown value prop change", value)
          setQuery(value)
        }
    }, [value])

    useEffect(() => {
        const fetchSuggestions = async () => {
            console.log("CitySearchDropdown: fetchSuggestions called with query:", query); // LOG 2

            if (query.length < 2) {
                console.log("CitySearchDropdown: Query too short, clearing suggestions"); // LOG 3
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
                console.log("CitySearchDropdown: Received suggestions:", data.results); // LOG 4
                setSuggestions(data.results || []);
                setIsOpen(data.results && data.results.length > 0);
            } catch (error) {
                console.error('CitySearchDropdown: Error fetching city suggestions:', error); // LOG 5
            }
        };

        const timerId = setTimeout(fetchSuggestions, 200);

        return () => clearTimeout(timerId);
    }, [query]);

    const handleSelect = (city: City) => {
        console.log("CitySearchDropdown: handleSelect called with city:", city); // LOG 6

        const selected = {
            name: city.name,
            stateCode: city.stateCode,
            lat: city.location.latitude,
            lng: city.location.longitude
        };
        setQuery(`${city.name}, ${city.stateCode}`);
        setSuggestions([]);
        setIsOpen(false);
        onSelect(selected); // Make sure onSelect is called
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("input change", e.target.value)
      setQuery(e.target.value);
      if (e.target.value.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        onSelect({name: "", stateCode: "", lat: 0, lng: 0}); //clears onSelect if less than 2 characters
      }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="text"
                value={query}
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
