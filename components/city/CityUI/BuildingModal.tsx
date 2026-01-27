'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Play } from 'lucide-react';
import { getProjectBySlug } from '@/lib/projects';
import { getCareerEntryByBuildingId } from '@/lib/data/career';
import { getDistrictById } from '@/lib/data/districts';
import { CityDistrict } from '@/lib/types';

interface BuildingInfo {
  id: string;
  name: string;
  projectSlug?: string;
  description?: string;
  district: CityDistrict;
}

interface BuildingModalProps {
  building: BuildingInfo;
  onClose: () => void;
}

export default function BuildingModal({ building, onClose }: BuildingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const project = building.projectSlug ? getProjectBySlug(building.projectSlug) : null;
  const careerEntry = getCareerEntryByBuildingId(building.id);
  const district = getDistrictById(building.district);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside (with delay to prevent immediate close from opening click)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Small delay to let the opening click event finish
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{building.name}</h2>
            {district && (
              <span
                className="text-xs px-2 py-1 rounded-full mt-1 inline-block"
                style={{ backgroundColor: district.color + '33', color: district.color }}
              >
                {district.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Career Info */}
          {careerEntry && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-white font-medium">{careerEntry.title}</h3>
              <p className="text-slate-400 text-sm">{careerEntry.company}</p>
              <p className="text-slate-500 text-xs mt-1">{careerEntry.period}</p>
              <p className="text-slate-300 text-sm mt-2">{careerEntry.description}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {careerEntry.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Project Info */}
          {project && (
            <div className="space-y-3">
              <div className="aspect-video bg-slate-700 rounded-lg overflow-hidden relative">
                {project.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.coverImage}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-slate-500" />
                  </div>
                )}
                {/* Video placeholder overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <div className="bg-white/20 rounded-full p-4">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute bottom-4 text-white text-sm">
                    Video coming soon
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium">{project.title}</h3>
                <p className="text-slate-400 text-sm">{project.role}</p>
                <p className="text-slate-300 text-sm mt-2">{project.shortDescription}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description fallback */}
          {!project && !careerEntry && building.description && (
            <p className="text-slate-300">{building.description}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          {project ? (
            <Link
              href={`/work/${project.slug}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
            >
              <span>View Full Case Study</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 border border-slate-600 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
