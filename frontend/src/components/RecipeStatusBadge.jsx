/**
 * Recipe Status Badge Component
 * Displays recipe status with appropriate styling
 */

import { Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const RecipeStatusBadge = ({ status }) => {
  const { t } = useTranslation();

  const getStatusConfig = (status) => {
    switch (status) {
      case 'published':
        return {
          bg: 'success',
          label: t('recipes.status.published', 'Published')
        };
      case 'draft':
        return {
          bg: 'warning',
          text: 'dark',
          label: t('recipes.status.draft', 'Draft')
        };
      case 'archived':
        return {
          bg: 'secondary',
          label: t('recipes.status.archived', 'Archived')
        };
      default:
        return {
          bg: 'light',
          text: 'dark',
          label: status
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge bg={config.bg} text={config.text}>
      {config.label}
    </Badge>
  );
};

export default RecipeStatusBadge;
