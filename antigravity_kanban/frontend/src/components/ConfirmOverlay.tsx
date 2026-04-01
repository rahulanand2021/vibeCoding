"use client";
import React from 'react';
import styles from './ConfirmOverlay.module.css';

interface ConfirmOverlayProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmOverlay({ isOpen, title, message, onConfirm, onCancel }: ConfirmOverlayProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>{title}</h2>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button className={styles.keepBtn} onClick={onCancel}>Keep</button>
                    <button className={styles.deleteBtn} onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    );
}
