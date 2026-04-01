"use client";

import { useState } from "react";

type AddCardFormProps = {
  onAddCard: (title: string, details: string) => void;
};

export function AddCardForm({ onAddCard }: AddCardFormProps) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !details.trim()) return;
    onAddCard(title, details);
    setTitle("");
    setDetails("");
    setIsOpen(false);
  };

  return (
    <>
      <button className="button-primary add-card-trigger" type="button" onClick={() => setIsOpen(true)}>
        Add
      </button>
      {isOpen ? (
        <div className="modal-backdrop" onClick={() => setIsOpen(false)}>
          <div
            className="add-card-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add card"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="add-card-form" onSubmit={handleSubmit}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Card title"
                aria-label="Card title"
                autoFocus
              />
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Card details"
                aria-label="Card details"
                rows={3}
              />
              <div className="modal-actions">
                <button className="button-secondary" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button className="button-primary" type="submit">
                  Add card
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
