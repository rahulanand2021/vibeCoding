'use client';

import { useState } from 'react';

interface AddCardModalProps {
  isOpen: boolean;
  onAdd: (title: string, details: string) => void;
  onCancel: () => void;
}

export default function AddCardModal({ isOpen, onAdd, onCancel }: AddCardModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && details.trim()) {
      onAdd(title, details);
      setTitle('');
      setDetails('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#f9fafc] rounded-xl p-6 w-96 border border-[#209dd7] shadow-lg">
        <h2 className="text-lg font-bold text-[#032147] mb-4">Add New Card</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#032147] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-[#032147] bg-white text-[#032147] rounded px-3 py-2 outline-none focus:ring-2 focus:ring-[#209dd7]"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#032147] mb-1">Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full border border-[#032147] bg-white text-[#032147] rounded px-3 py-2 h-20 outline-none focus:ring-2 focus:ring-[#209dd7]"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#032147] text-[#032147] rounded hover:bg-[#e8f4ff]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#753991] text-white rounded hover:bg-[#5a2f74]"
            >
              Add Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}