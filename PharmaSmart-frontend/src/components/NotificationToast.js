import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { FaShoppingBag, FaCheckCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationToast = () => {
  const { newNotification, clearNewNotification, markAsRead } = useNotifications();
  const navigate = useNavigate();

  if (!newNotification) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'COMMANDE':
        return <FaShoppingBag size={20} style={{ color: '#0B6E4F' }} />;
      case 'SUCCESS':
        return <FaCheckCircle size={20} style={{ color: '#28a745' }} />;
      case 'WARNING':
        return <FaExclamationTriangle size={20} style={{ color: '#ffc107' }} />;
      case 'ERROR':
        return <FaExclamationTriangle size={20} style={{ color: '#dc3545' }} />;
      case 'STOCK':
        return <FaExclamationTriangle size={20} style={{ color: '#fd7e14' }} />;
      default:
        return <FaInfoCircle size={20} style={{ color: '#17a2b8' }} />;
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'COMMANDE': return '#0B6E4F';
      case 'SUCCESS': return '#28a745';
      case 'WARNING': return '#ffc107';
      case 'ERROR': return '#dc3545';
      case 'STOCK': return '#fd7e14';
      default: return '#17a2b8';
    }
  };

  const handleClick = () => {
    if (newNotification.lien) {
      navigate(newNotification.lien);
    }
    markAsRead(newNotification.id);
    clearNewNotification();
  };

  const handleClose = () => {
    markAsRead(newNotification.id);
    clearNewNotification();
  };

  return (
    <ToastContainer 
      position="top-end" 
      className="p-3" 
      style={{ zIndex: 9999, position: 'fixed', top: '80px', right: '20px' }}
    >
      <Toast
        show={true}
        onClose={handleClose}
        delay={5000}
        autohide
        style={{
          borderLeft: `4px solid ${getBorderColor(newNotification.type)}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          cursor: newNotification.lien ? 'pointer' : 'default'
        }}
        onClick={handleClick}
      >
        <Toast.Header closeButton={false}>
          <div className="d-flex align-items-center me-auto">
            {getIcon(newNotification.type)}
            <strong className="ms-2">{newNotification.titre}</strong>
          </div>
          <small className="text-muted me-2">À l'instant</small>
          <button 
            type="button" 
            className="btn-close" 
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
          />
        </Toast.Header>
        <Toast.Body>
          {newNotification.message}
          {newNotification.lien && (
            <div className="mt-2">
              <small className="text-primary">Cliquez pour voir →</small>
            </div>
          )}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default NotificationToast;
