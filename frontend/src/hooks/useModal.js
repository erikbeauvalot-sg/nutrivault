/**
 * useModal Hook
 * Manages modal visibility and associated data
 */

import { useState, useCallback } from 'react';

/**
 * Hook for managing modal state
 *
 * @param {boolean} initialState - Initial open state (default: false)
 *
 * @returns {Object} Modal state and controls
 *
 * @example
 * // Simple usage
 * const { isOpen, open, close, toggle } = useModal();
 *
 * // With data
 * const { isOpen, data, open, close } = useModal();
 * open({ patientId: 123 }); // Pass data when opening
 * // In modal: data.patientId === 123
 */
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);
  const [data, setData] = useState(null);

  const open = useCallback((modalData = null) => {
    setData(modalData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Delay clearing data to allow close animation
    setTimeout(() => setData(null), 300);
  }, []);

  const toggle = useCallback((modalData = null) => {
    setIsOpen(prev => {
      if (!prev && modalData) {
        setData(modalData);
      }
      return !prev;
    });
  }, []);

  const setModalData = useCallback((newData) => {
    setData(newData);
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    setData: setModalData
  };
}

/**
 * Hook for managing multiple modals
 *
 * @returns {Object} Modal management functions
 *
 * @example
 * const modals = useModals();
 *
 * // Open specific modal
 * modals.open('edit', { patientId: 123 });
 *
 * // Check if modal is open
 * modals.isOpen('edit') // true
 *
 * // Get modal data
 * modals.getData('edit') // { patientId: 123 }
 */
export function useModals() {
  const [openModals, setOpenModals] = useState({});
  const [modalData, setModalData] = useState({});

  const open = useCallback((modalName, data = null) => {
    setOpenModals(prev => ({ ...prev, [modalName]: true }));
    if (data !== null) {
      setModalData(prev => ({ ...prev, [modalName]: data }));
    }
  }, []);

  const close = useCallback((modalName) => {
    setOpenModals(prev => ({ ...prev, [modalName]: false }));
    // Delay clearing data to allow close animation
    setTimeout(() => {
      setModalData(prev => {
        const newData = { ...prev };
        delete newData[modalName];
        return newData;
      });
    }, 300);
  }, []);

  const toggle = useCallback((modalName, data = null) => {
    setOpenModals(prev => {
      const isCurrentlyOpen = prev[modalName];
      if (!isCurrentlyOpen && data !== null) {
        setModalData(prevData => ({ ...prevData, [modalName]: data }));
      }
      return { ...prev, [modalName]: !isCurrentlyOpen };
    });
  }, []);

  const isOpen = useCallback((modalName) => {
    return !!openModals[modalName];
  }, [openModals]);

  const getData = useCallback((modalName) => {
    return modalData[modalName] || null;
  }, [modalData]);

  const closeAll = useCallback(() => {
    setOpenModals({});
    setTimeout(() => setModalData({}), 300);
  }, []);

  return {
    open,
    close,
    toggle,
    isOpen,
    getData,
    closeAll,
    openModals,
    modalData
  };
}

export default useModal;
