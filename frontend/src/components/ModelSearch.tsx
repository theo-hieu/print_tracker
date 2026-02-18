import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check, Users } from "lucide-react";

interface Model {
  ModelID: number;
  ModelName: string;
  Client?: {
    Name: string;
  } | null;
}

interface ModelSearchProps {
  models: Model[];
  selectedModelID: number | string;
  onSelect: (modelID: number) => void;
  className?: string;
}

export default function ModelSearch({
  models,
  selectedModelID,
  onSelect,
  className = "",
}: ModelSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedModel = models.find(
    (m) => m.ModelID === Number(selectedModelID),
  );

  const filteredModels = models.filter(
    (m) =>
      m.ModelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.Client?.Name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (modelID: number) => {
    onSelect(modelID);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Area */}
      <div
        className={`w-full border border-gray-300 rounded p-2 bg-white flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-red-500 transition-shadow ${
          isOpen ? "ring-2 ring-red-500 border-transparent" : ""
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full outline-none text-sm placeholder-gray-400"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        ) : (
          <div className="flex items-center gap-2 overflow-hidden">
            {selectedModel ? (
              <>
                <span className="text-sm text-gray-900 truncate font-medium">
                  {selectedModel.ModelName}
                </span>
                {selectedModel.Client && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                    {selectedModel.Client.Name}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400">Select model...</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {selectedModel && !isOpen && (
            <X
              size={16}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(0); // Assuming 0 as 'no selection' or empty
              }}
            />
          )}
          <Search size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredModels.length > 0 ? (
            filteredModels.map((m) => (
              <div
                key={m.ModelID}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                  m.ModelID === Number(selectedModelID)
                    ? "bg-red-50 text-red-900"
                    : "text-gray-700"
                }`}
                onClick={() => handleSelect(m.ModelID)}
              >
                <div className="flex flex-col truncate">
                  <span className="font-medium truncate">{m.ModelName}</span>
                  {m.Client && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users size={10} /> {m.Client.Name}
                    </span>
                  )}
                </div>
                {m.ModelID === Number(selectedModelID) && (
                  <Check size={16} className="text-red-600 shrink-0 ml-2" />
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              No models found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
