import { useTranslation } from 'react-i18next';

const DateSeparator = ({ date }) => {
  const { t } = useTranslation();

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = (today - target) / (1000 * 60 * 60 * 24);

    if (diff === 0) return t('messages.today', "Aujourd'hui");
    if (diff === 1) return t('messages.yesterday', 'Hier');

    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  return (
    <div className="d-flex align-items-center my-3" style={{ gap: '0.75rem' }}>
      <div style={{ flex: 1, height: 1, background: '#ddd' }} />
      <span style={{ fontSize: '0.72rem', color: '#999', fontWeight: 500, whiteSpace: 'nowrap' }}>
        {formatDateLabel(date)}
      </span>
      <div style={{ flex: 1, height: 1, background: '#ddd' }} />
    </div>
  );
};

export default DateSeparator;
