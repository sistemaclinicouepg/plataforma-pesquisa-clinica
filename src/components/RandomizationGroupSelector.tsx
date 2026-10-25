'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shuffle, Search, Check, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';

interface RandomizationGroupSelectorProps {
  value: string;
  onChange: (group: string) => void;
  availableGroups: string[];
}

export function RandomizationGroupSelector({
  value,
  onChange,
  availableGroups,
}: RandomizationGroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar lista suspensa ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (group: string) => {
    onChange(group);
    setSearchTerm('');
    setIsOpen(false);
  };

  const filteredGroups = availableGroups.filter((grp) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return grp.toLowerCase().includes(query);
  });

  const isCustomGroup =
    searchTerm.trim().length > 0 &&
    !availableGroups.some((g) => g.toLowerCase() === searchTerm.trim().toLowerCase());

  // Texto a ser exibido no input
  const displayInputValue = isOpen && searchTerm !== '' ? searchTerm : (value || '');

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative flex items-center">
        <Shuffle className="w-3.5 h-3.5 text-indigo-500 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={displayInputValue}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onClick={() => {
            setIsOpen(true);
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredGroups.length > 0 && searchTerm.trim().length > 0) {
                handleSelect(filteredGroups[0]);
              } else if (isCustomGroup) {
                handleSelect(searchTerm.trim());
              } else {
                setIsOpen(false);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
              setSearchTerm('');
            }
          }}
          placeholder="Não alocar agora (Definir depois na lista de participantes)"
          className="w-full pl-8 pr-16 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition shadow-2xs"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Remover alocação (Não alocar agora)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) setSearchTerm('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title={isOpen ? 'Ocultar opções' : 'Exibir grupos disponíveis'}
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* LISTA OCULTA DROPDOWN QUE SÓ APARECE AO CLICAR E FILTRA AO DIGITAR */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto animate-in fade-in duration-100">
          <div className="px-3 py-1.5 bg-indigo-50/70 text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center justify-between">
            <span>Grupos de Randomização ({availableGroups.length})</span>
            <span className="font-normal text-indigo-600 lowercase">clique para selecionar</span>
          </div>

          {/* Opção padrão: Não alocar agora */}
          <button
            type="button"
            onClick={() => handleSelect('')}
            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition cursor-pointer select-none ${
              !value
                ? 'bg-indigo-50/90 text-indigo-950 font-bold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                  !value
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {!value && <Check className="w-3 h-3 stroke-[3]" />}
              </span>
              <span>Não alocar agora (Definir depois na lista de participantes)</span>
            </span>
            {!value && (
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider shrink-0 ml-2">
                Padrão
              </span>
            )}
          </button>

          {/* Lista de grupos disponíveis no estudo */}
          {filteredGroups.map((grp) => {
            const isSelected = value === grp;
            return (
              <button
                key={grp}
                type="button"
                onClick={() => handleSelect(grp)}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-indigo-50/90 text-indigo-950 font-bold'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span>{grp}</span>
                </span>
                {isSelected && (
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider shrink-0 ml-2">
                    Selecionado
                  </span>
                )}
              </button>
            );
          })}

          {/* Opção para criar/usar novo grupo digitado */}
          {isCustomGroup && (
            <button
              type="button"
              onClick={() => handleSelect(searchTerm.trim())}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>
                Definir novo grupo: <strong>"{searchTerm.trim()}"</strong>
              </span>
            </button>
          )}

          {filteredGroups.length === 0 && !isCustomGroup && availableGroups.length > 0 && (
            <div className="p-3 text-center text-xs text-slate-500">
              Nenhum grupo encontrado com "{searchTerm}". Pressione Enter ou use a opção de criar novo grupo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
