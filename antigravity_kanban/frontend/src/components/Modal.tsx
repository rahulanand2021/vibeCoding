"use client";
import React, { useState } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    title: string;
    initialCardTitle?: string;
    initialCardDetails?: string;
    onClose: () => void;
    onSubmit: (title: string, details: string) => void;
    submitText: string;
}

export function Modal({ isOpen, title, initialCardTitle = '', initialCardDetails = '', onClose, onSubmit, submitText }: ModalProps) {
    const [cardTitle, setCardTitle] = useState(initialCardTitle);
    const [cardDetails, setCardDetails] = useState(initialCardDetails);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>{title}</h2>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Title</label>
                    <input
                        autoFocus
                        className={styles.input}
                        value={cardTitle}
                        onChange={(e) => setCardTitle(e.target.value)}
                        placeholder="Enter card title..."
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Details</label>
                    <textarea
                        className={styles.textarea}
                        value={cardDetails}
                        onChange={(e) => setCardDetails(e.target.value)}
                        placeholder="Enter card details..."
                        rows={4}
                    />
                </div>
                <div className={styles.actions}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button
                        className={styles.submitBtn}
                        onClick={() => onSubmit(cardTitle, cardDetails)}
                        disabled={!cardTitle.trim() || !cardDetails.trim()}
                    >
                        {submitText}
                    </button>
                </div>
            </div>
        </div>
    );
}
