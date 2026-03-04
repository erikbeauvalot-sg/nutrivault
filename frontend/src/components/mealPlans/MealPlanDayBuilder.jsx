/**
 * MealPlanDayBuilder
 * Interactive editor for the full day/meal/item structure of a meal plan.
 */

import { useState } from 'react';
import { Button, Form, Row, Col, Card, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const MEAL_TYPES = [
  'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack', 'other'
];

const emptyItem = () => ({ name: '', quantity: '', unit: '', notes: '' });
const emptyMeal = () => ({ meal_type: 'other', label: '', notes: '', items: [emptyItem()] });
const emptyDay = (dayNumber) => ({ day_number: dayNumber, label: '', notes: '', meals: [emptyMeal()] });

const MealPlanDayBuilder = ({ days: initialDays = [], onChange }) => {
  const { t } = useTranslation();
  const [days, setDays] = useState(
    initialDays.length > 0 ? initialDays : [emptyDay(1)]
  );

  const notify = (updated) => {
    setDays(updated);
    onChange && onChange(updated);
  };

  // Day operations
  const addDay = () => {
    const nextNum = days.length > 0 ? Math.max(...days.map(d => d.day_number)) + 1 : 1;
    notify([...days, emptyDay(nextNum)]);
  };

  const removeDay = (idx) => {
    notify(days.filter((_, i) => i !== idx));
  };

  const updateDay = (idx, field, value) => {
    const updated = days.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    notify(updated);
  };

  // Meal operations
  const addMeal = (dayIdx) => {
    const updated = days.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, meals: [...(d.meals || []), emptyMeal()] };
    });
    notify(updated);
  };

  const removeMeal = (dayIdx, mealIdx) => {
    const updated = days.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, meals: d.meals.filter((_, mi) => mi !== mealIdx) };
    });
    notify(updated);
  };

  const updateMeal = (dayIdx, mealIdx, field, value) => {
    const updated = days.map((d, i) => {
      if (i !== dayIdx) return d;
      const meals = d.meals.map((m, mi) => mi === mealIdx ? { ...m, [field]: value } : m);
      return { ...d, meals };
    });
    notify(updated);
  };

  // Item operations
  const addItem = (dayIdx, mealIdx) => {
    const updated = days.map((d, i) => {
      if (i !== dayIdx) return d;
      const meals = d.meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        return { ...m, items: [...(m.items || []), emptyItem()] };
      });
      return { ...d, meals };
    });
    notify(updated);
  };

  const removeItem = (dayIdx, mealIdx, itemIdx) => {
    const updated = days.map((d, i) => {
      if (i !== dayIdx) return d;
      const meals = d.meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        return { ...m, items: m.items.filter((_, ii) => ii !== itemIdx) };
      });
      return { ...d, meals };
    });
    notify(updated);
  };

  const updateItem = (dayIdx, mealIdx, itemIdx, field, value) => {
    const updated = days.map((d, i) => {
      if (i !== dayIdx) return d;
      const meals = d.meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        const items = m.items.map((it, ii) => ii === itemIdx ? { ...it, [field]: value } : it);
        return { ...m, items };
      });
      return { ...d, meals };
    });
    notify(updated);
  };

  return (
    <div>
      {days.map((day, dayIdx) => (
        <Card key={dayIdx} className="mb-3 border-0 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center py-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Badge bg="primary" className="fs-6">
                {t('mealPlans.days.day', 'Day {{number}}', { number: day.day_number })}
              </Badge>
              <Form.Control
                size="sm"
                style={{ width: '180px' }}
                value={day.label || ''}
                onChange={e => updateDay(dayIdx, 'label', e.target.value)}
                placeholder={t('mealPlans.meals.label', 'Label (optional)')}
              />
            </div>
            <Button size="sm" variant="outline-danger" onClick={() => removeDay(dayIdx)}>
              {t('mealPlans.days.removeDay', 'Remove day')}
            </Button>
          </Card.Header>

          <Card.Body className="pt-2">
            {(day.meals || []).map((meal, mealIdx) => (
              <div key={mealIdx} className="mb-3 p-2 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <Form.Select
                      size="sm"
                      style={{ width: '160px' }}
                      value={meal.meal_type}
                      onChange={e => updateMeal(dayIdx, mealIdx, 'meal_type', e.target.value)}
                    >
                      {MEAL_TYPES.map(mt => (
                        <option key={mt} value={mt}>
                          {t(`mealPlans.mealTypes.${mt}`, mt)}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control
                      size="sm"
                      style={{ width: '150px' }}
                      value={meal.label || ''}
                      onChange={e => updateMeal(dayIdx, mealIdx, 'label', e.target.value)}
                      placeholder={t('mealPlans.meals.label', 'Label (optional)')}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => removeMeal(dayIdx, mealIdx)}
                  >
                    ×
                  </Button>
                </div>

                {/* Items */}
                {(meal.items || []).map((item, itemIdx) => (
                  <Row key={itemIdx} className="g-1 mb-1 align-items-center">
                    <Col xs={5}>
                      <Form.Control
                        size="sm"
                        value={item.name}
                        onChange={e => updateItem(dayIdx, mealIdx, itemIdx, 'name', e.target.value)}
                        placeholder={t('mealPlans.items.namePlaceholder', 'Food or recipe...')}
                      />
                    </Col>
                    <Col xs={2}>
                      <Form.Control
                        size="sm"
                        value={item.quantity || ''}
                        onChange={e => updateItem(dayIdx, mealIdx, itemIdx, 'quantity', e.target.value)}
                        placeholder={t('mealPlans.items.quantity', 'Qty')}
                      />
                    </Col>
                    <Col xs={2}>
                      <Form.Control
                        size="sm"
                        value={item.unit || ''}
                        onChange={e => updateItem(dayIdx, mealIdx, itemIdx, 'unit', e.target.value)}
                        placeholder={t('mealPlans.items.unit', 'Unit')}
                      />
                    </Col>
                    <Col xs={2}>
                      <Form.Control
                        size="sm"
                        value={item.notes || ''}
                        onChange={e => updateItem(dayIdx, mealIdx, itemIdx, 'notes', e.target.value)}
                        placeholder={t('mealPlans.notes', 'Notes')}
                      />
                    </Col>
                    <Col xs={1}>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removeItem(dayIdx, mealIdx, itemIdx)}
                        disabled={meal.items.length === 1}
                      >
                        ×
                      </Button>
                    </Col>
                  </Row>
                ))}

                <Button
                  size="sm"
                  variant="outline-primary"
                  className="mt-1"
                  onClick={() => addItem(dayIdx, mealIdx)}
                >
                  + {t('mealPlans.items.addItem', 'Add food item')}
                </Button>
              </div>
            ))}

            <Button size="sm" variant="outline-secondary" onClick={() => addMeal(dayIdx)}>
              + {t('mealPlans.meals.addMeal', 'Add meal')}
            </Button>
          </Card.Body>
        </Card>
      ))}

      <Button variant="outline-primary" onClick={addDay}>
        + {t('mealPlans.days.addDay', 'Add day')}
      </Button>
    </div>
  );
};

export default MealPlanDayBuilder;
